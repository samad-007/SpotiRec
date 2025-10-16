"""
SpotiRec - Flask Backend Server
Music recommendation system using Spotify API and MongoDB
"""

import os
import base64
from datetime import timedelta
from flask import Flask, request, redirect, jsonify, session, send_from_directory, send_file
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv
import requests
from urllib.parse import urlencode
import matplotlib
matplotlib.use('Agg')  # Use non-GUI backend
import matplotlib.pyplot as plt
import numpy as np
from io import BytesIO
import base64 as b64

# Load environment variables
load_dotenv()

app = Flask(__name__, static_folder='public', static_url_path='')
app.secret_key = os.getenv('SESSION_SECRET', 'default-secret-key')
app.config['SESSION_COOKIE_SECURE'] = False  # Set to True if using HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)

CORS(app)

# MongoDB Connection
db = None
songs_collection = None

def connect_to_mongodb():
    """Connect to MongoDB Atlas"""
    global db, songs_collection
    try:
        client = MongoClient(os.getenv('MONGODB_URI'))
        db = client['recommender']  # Your database name
        songs_collection = db['cleaned_copy3']  # Your collection name
        
        # Log connection details
        print('✅ Connected to MongoDB Atlas')
        print('📊 Database: recommender')
        print('📁 Collection: cleaned_copy3')
        
        # Check if collection has documents
        count = songs_collection.count_documents({})
        print(f'🎵 Found {count} songs in collection')
    except Exception as error:
        print(f'❌ MongoDB connection error: {error}')
        exit(1)

# Spotify API Configuration
SPOTIFY_CLIENT_ID = os.getenv('SPOTIFY_CLIENT_ID')
SPOTIFY_CLIENT_SECRET = os.getenv('SPOTIFY_CLIENT_SECRET')
SPOTIFY_REDIRECT_URI = os.getenv('SPOTIFY_REDIRECT_URI')

# Routes

@app.route('/')
def index():
    """Serve index.html"""
    return send_from_directory('.', 'index.html')

@app.route('/login')
def login():
    """Redirect to Spotify authorization"""
    scope = 'user-read-private user-read-email user-top-read user-read-recently-played'
    params = {
        'response_type': 'code',
        'client_id': SPOTIFY_CLIENT_ID,
        'scope': scope,
        'redirect_uri': SPOTIFY_REDIRECT_URI
    }
    auth_url = f'https://accounts.spotify.com/authorize?{urlencode(params)}'
    return redirect(auth_url)

@app.route('/callback')
def callback():
    """Handle Spotify OAuth callback"""
    code = request.args.get('code')
    
    if not code:
        return redirect('/?error=no_code')
    
    try:
        # Exchange code for access token
        auth_str = f'{SPOTIFY_CLIENT_ID}:{SPOTIFY_CLIENT_SECRET}'
        auth_bytes = auth_str.encode('utf-8')
        auth_base64 = base64.b64encode(auth_bytes).decode('utf-8')
        
        token_response = requests.post(
            'https://accounts.spotify.com/api/token',
            data={
                'grant_type': 'authorization_code',
                'code': code,
                'redirect_uri': SPOTIFY_REDIRECT_URI
            },
            headers={
                'Authorization': f'Basic {auth_base64}',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        )
        
        if token_response.status_code != 200:
            print(f'Error getting access token: {token_response.text}')
            return redirect('/?error=auth_failed')
        
        token_data = token_response.json()
        session['access_token'] = token_data['access_token']
        session['refresh_token'] = token_data.get('refresh_token')
        session.permanent = True
        
        return redirect('/?auth=success')
    except Exception as error:
        print(f'Error getting access token: {error}')
        return redirect('/?error=auth_failed')

@app.route('/api/user')
def get_user():
    """Get user profile"""
    if 'access_token' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        response = requests.get(
            'https://api.spotify.com/v1/me',
            headers={'Authorization': f'Bearer {session["access_token"]}'}
        )
        
        if response.status_code != 200:
            return jsonify({'error': 'Failed to fetch user profile'}), 500
        
        return jsonify(response.json())
    except Exception as error:
        print(f'Error fetching user profile: {error}')
        return jsonify({'error': 'Failed to fetch user profile'}), 500

@app.route('/api/top-tracks')
def get_top_tracks():
    """Get user's top tracks"""
    if 'access_token' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        response = requests.get(
            'https://api.spotify.com/v1/me/top/tracks',
            headers={'Authorization': f'Bearer {session["access_token"]}'},
            params={'limit': 20, 'time_range': 'medium_term'}
        )
        
        if response.status_code != 200:
            return jsonify({'error': 'Failed to fetch top tracks'}), 500
        
        return jsonify(response.json())
    except Exception as error:
        print(f'Error fetching top tracks: {error}')
        return jsonify({'error': 'Failed to fetch top tracks'}), 500

@app.route('/api/recommendations')
def get_recommendations():
    """Get recommendations from MongoDB based on user's listening pattern"""
    if 'access_token' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        # Try different time ranges to get user's top tracks
        top_tracks = []
        time_range_used = ''
        
        # Try short_term first (last 4 weeks)
        try:
            short_term_response = requests.get(
                'https://api.spotify.com/v1/me/top/tracks',
                headers={'Authorization': f'Bearer {session["access_token"]}'},
                params={'limit': 20, 'time_range': 'short_term'}
            )
            if short_term_response.status_code == 200:
                data = short_term_response.json()
                top_tracks = data.get('items', [])
                time_range_used = 'short_term (last 4 weeks)'
        except:
            print('⚠️  No short_term data available')
        
        # If no short_term data, try medium_term (last 6 months)
        if not top_tracks:
            try:
                medium_term_response = requests.get(
                    'https://api.spotify.com/v1/me/top/tracks',
                    headers={'Authorization': f'Bearer {session["access_token"]}'},
                    params={'limit': 20, 'time_range': 'medium_term'}
                )
                if medium_term_response.status_code == 200:
                    data = medium_term_response.json()
                    top_tracks = data.get('items', [])
                    time_range_used = 'medium_term (last 6 months)'
            except:
                print('⚠️  No medium_term data available')
        
        # If still no data, try long_term (several years)
        if not top_tracks:
            try:
                long_term_response = requests.get(
                    'https://api.spotify.com/v1/me/top/tracks',
                    headers={'Authorization': f'Bearer {session["access_token"]}'},
                    params={'limit': 20, 'time_range': 'long_term'}
                )
                if long_term_response.status_code == 200:
                    data = long_term_response.json()
                    top_tracks = data.get('items', [])
                    time_range_used = 'long_term (all time)'
            except:
                print('⚠️  No long_term data available')
        
        # Check if user has any top tracks across all time ranges
        if not top_tracks:
            print('⚠️  User has NO listening history across all time ranges')
            print('⚠️  Returning random recommendations - user needs to listen to music on Spotify first!')
            random_recommendations = list(songs_collection.aggregate([
                {'$sample': {'size': 20}}
            ]))
            
            # Convert ObjectId to string for JSON serialization
            for rec in random_recommendations:
                rec['_id'] = str(rec['_id'])
            
            return jsonify({
                'recommendations': random_recommendations,
                'userPreferences': {
                    'topArtists': [],
                    'topGenres': [],
                    'avgEnergy': 0.5,
                    'avgDanceability': 0.5,
                    'avgValence': 0.5
                },
                'message': 'No listening history found. Please listen to music on Spotify to get personalized recommendations!'
            })
        
        print(f'✅ Found {len(top_tracks)} top tracks using {time_range_used}')
        sample_tracks = ', '.join([f'"{t["name"]}" by {t["artists"][0]["name"]}' for t in top_tracks[:3]])
        print(f'🎵 Sample tracks: {sample_tracks}')
        
        # Extract genres and artists from top tracks
        top_artists = list(set([artist['name'] for track in top_tracks for artist in track['artists']]))
        top_genres = list(set([genre for track in top_tracks for artist in track['artists'] for genre in artist.get('genres', [])]))
        
        print(f'🎤 Your top artists: {", ".join(top_artists[:5])}')
        
        # Find matching songs in MongoDB by artist first
        artist_matches = list(songs_collection.find(
            {'Artist': {'$in': top_artists}}
        ).limit(100))
        
        print(f'📊 Found {len(artist_matches)} songs in database by your favorite artists')
        
        # Calculate average audio features from the artist matches in our database
        avg_energy = 0.6  # default values
        avg_danceability = 0.6
        avg_valence = 0.6
        
        if artist_matches:
            # Use the audio features from songs by artists you like
            avg_energy = sum(s.get('Energy', 0.6) for s in artist_matches) / len(artist_matches)
            avg_danceability = sum(s.get('Danceability', 0.6) for s in artist_matches) / len(artist_matches)
            avg_valence = sum(s.get('Valence', 0.6) for s in artist_matches) / len(artist_matches)
            
            print(f'🎵 Calculated preferences from {len(artist_matches)} matching songs in database')
        else:
            print('⚠️  No matching artists in database, using default audio feature values')
        
        # Query MongoDB for recommendations
        print(f'🎯 Generating recommendations with preferences:')
        print(f'   - Top Artists: {", ".join(top_artists[:5])}')
        print(f'   - Energy: {avg_energy:.2f}, Danceability: {avg_danceability:.2f}, Valence: {avg_valence:.2f}')
        
        if songs_collection is None:
            print('❌ MongoDB collection not initialized!')
            return jsonify({'error': 'Database not connected'}), 500
        
        # Use aggregation pipeline for better matching and scoring
        recommendations = list(songs_collection.aggregate([
            {
                '$match': {
                    '$or': [
                        # Priority 1: Match by artist (exact match)
                        {'Artist': {'$in': top_artists}},
                        # Priority 2: Match by similar audio features (wider range for better results)
                        {
                            '$and': [
                                {'Energy': {'$gte': avg_energy - 0.3, '$lte': avg_energy + 0.3}},
                                {'Danceability': {'$gte': avg_danceability - 0.3, '$lte': avg_danceability + 0.3}}
                            ]
                        },
                        # Priority 3: Match by valence (mood)
                        {'Valence': {'$gte': avg_valence - 0.3, '$lte': avg_valence + 0.3}}
                    ]
                }
            },
            {
                # Add a score field to rank recommendations
                '$addFields': {
                    'score': {
                        '$add': [
                            # Artist match gets highest score (10 points)
                            {'$cond': [{'$in': ['$Artist', top_artists]}, 10, 0]},
                            # Energy similarity (up to 5 points)
                            {
                                '$multiply': [
                                    5,
                                    {
                                        '$subtract': [
                                            1,
                                            {'$abs': {'$subtract': ['$Energy', avg_energy]}}
                                        ]
                                    }
                                ]
                            },
                            # Danceability similarity (up to 5 points)
                            {
                                '$multiply': [
                                    5,
                                    {
                                        '$subtract': [
                                            1,
                                            {'$abs': {'$subtract': ['$Danceability', avg_danceability]}}
                                        ]
                                    }
                                ]
                            },
                            # Valence similarity (up to 3 points)
                            {
                                '$multiply': [
                                    3,
                                    {
                                        '$subtract': [
                                            1,
                                            {'$abs': {'$subtract': ['$Valence', avg_valence]}}
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                }
            },
            {'$sort': {'score': -1}},  # Sort by best matches first
            {'$limit': 20}
        ]))
        
        print(f'✅ Found {len(recommendations)} personalized recommendations')
        
        if recommendations:
            top_rec = recommendations[0]
            score = top_rec.get('score', 0)
            print(f'🎵 Top recommendation: "{top_rec["Track"]}" by {top_rec["Artist"]} (score: {score:.1f})')
            artist_match_count = sum(1 for r in recommendations if r['Artist'] in top_artists)
            print(f'🎯 {artist_match_count} recommendations match your favorite artists')
        
        # If we didn't find enough recommendations, supplement with random ones
        if len(recommendations) < 10:
            print(f'⚠️  Only found {len(recommendations)} matches, adding random songs to reach 20')
            existing_ids = [r['_id'] for r in recommendations]
            additional_songs = list(songs_collection.aggregate([
                {'$match': {'_id': {'$nin': existing_ids}}},
                {'$sample': {'size': 20 - len(recommendations)}}
            ]))
            recommendations.extend(additional_songs)
        
        # Convert ObjectId to string for JSON serialization
        for rec in recommendations:
            rec['_id'] = str(rec['_id'])
        
        # Store in session for visualization
        user_preferences = {
            'topArtists': top_artists[:5],
            'topGenres': top_genres[:5],
            'avgEnergy': avg_energy,
            'avgDanceability': avg_danceability,
            'avgValence': avg_valence
        }
        session['user_preferences'] = user_preferences
        session['recommendations'] = recommendations
        
        return jsonify({
            'recommendations': recommendations,
            'userPreferences': user_preferences
        })
    except Exception as error:
        print(f'Error generating recommendations: {error}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to generate recommendations'}), 500

@app.route('/logout')
def logout():
    """Logout user"""
    session.clear()
    return redirect('/')

@app.route('/api/auth-status')
def auth_status():
    """Check authentication status"""
    return jsonify({'authenticated': 'access_token' in session})

@app.route('/api/visualize-analysis')
def visualize_analysis():
    """Generate visualization comparing user preferences with recommendations"""
    if 'access_token' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    if 'user_preferences' not in session or 'recommendations' not in session:
        return jsonify({'error': 'Generate recommendations first'}), 400
    
    try:
        user_prefs = session['user_preferences']
        recommendations = session['recommendations']
        
        # Set style for aesthetic graphs
        plt.style.use('dark_background')
        
        # Create figure with subplots
        fig = plt.figure(figsize=(16, 10))
        fig.patch.set_facecolor('#121212')
        
        # Define colors matching Spotify theme
        spotify_green = '#1DB954'
        spotify_white = '#FFFFFF'
        spotify_gray = '#535353'
        rec_color = '#FF006C'
        
        # Extract audio features from recommendations
        rec_energy = [r.get('Energy', 0) for r in recommendations if r.get('Energy') is not None]
        rec_dance = [r.get('Danceability', 0) for r in recommendations if r.get('Danceability') is not None]
        rec_valence = [r.get('Valence', 0) for r in recommendations if r.get('Valence') is not None]
        
        # User preferences
        user_energy = user_prefs.get('avgEnergy', 0.5)
        user_dance = user_prefs.get('avgDanceability', 0.5)
        user_valence = user_prefs.get('avgValence', 0.5)
        
        # 1. Radar Chart - Audio Features Comparison
        ax1 = plt.subplot(2, 3, 1, projection='polar')
        categories = ['Energy', 'Danceability', 'Valence']
        N = len(categories)
        
        # User data
        user_values = [user_energy, user_dance, user_valence]
        user_values += user_values[:1]  # Complete the circle
        
        # Recommendations average
        rec_values = [
            np.mean(rec_energy) if rec_energy else 0.5,
            np.mean(rec_dance) if rec_dance else 0.5,
            np.mean(rec_valence) if rec_valence else 0.5
        ]
        rec_values += rec_values[:1]
        
        angles = [n / float(N) * 2 * np.pi for n in range(N)]
        angles += angles[:1]
        
        ax1.plot(angles, user_values, 'o-', linewidth=2, color=spotify_green, label='Your Taste')
        ax1.fill(angles, user_values, alpha=0.25, color=spotify_green)
        ax1.plot(angles, rec_values, 'o-', linewidth=2, color=rec_color, label='Recommendations')
        ax1.fill(angles, rec_values, alpha=0.25, color=rec_color)
        
        ax1.set_xticks(angles[:-1])
        ax1.set_xticklabels(categories, color=spotify_white, size=10)
        ax1.set_ylim(0, 1)
        ax1.set_title('Audio Features Comparison', color=spotify_white, size=12, pad=20, weight='bold')
        ax1.legend(loc='upper right', bbox_to_anchor=(1.3, 1.1))
        ax1.grid(color=spotify_gray, alpha=0.3)
        
        # 2. Distribution - Energy
        ax2 = plt.subplot(2, 3, 2)
        if rec_energy:
            ax2.hist(rec_energy, bins=15, alpha=0.7, color=rec_color, edgecolor='white', linewidth=0.5)
            ax2.axvline(user_energy, color=spotify_green, linestyle='--', linewidth=2, label='Your Average')
            ax2.set_xlabel('Energy Level', color=spotify_white, size=10)
            ax2.set_ylabel('Number of Songs', color=spotify_white, size=10)
            ax2.set_title('Energy Distribution', color=spotify_white, size=12, weight='bold')
            ax2.legend()
            ax2.tick_params(colors=spotify_white)
            ax2.set_facecolor('#1a1a1a')
        
        # 3. Distribution - Danceability
        ax3 = plt.subplot(2, 3, 3)
        if rec_dance:
            ax3.hist(rec_dance, bins=15, alpha=0.7, color=rec_color, edgecolor='white', linewidth=0.5)
            ax3.axvline(user_dance, color=spotify_green, linestyle='--', linewidth=2, label='Your Average')
            ax3.set_xlabel('Danceability', color=spotify_white, size=10)
            ax3.set_ylabel('Number of Songs', color=spotify_white, size=10)
            ax3.set_title('Danceability Distribution', color=spotify_white, size=12, weight='bold')
            ax3.legend()
            ax3.tick_params(colors=spotify_white)
            ax3.set_facecolor('#1a1a1a')
        
        # 4. Scatter Plot - Energy vs Danceability
        ax4 = plt.subplot(2, 3, 4)
        if rec_energy and rec_dance:
            ax4.scatter(rec_energy, rec_dance, alpha=0.6, s=100, color=rec_color, edgecolors='white', linewidth=0.5)
            ax4.scatter([user_energy], [user_dance], s=300, color=spotify_green, marker='*', 
                       edgecolors='white', linewidth=2, label='Your Profile', zorder=5)
            ax4.set_xlabel('Energy', color=spotify_white, size=10)
            ax4.set_ylabel('Danceability', color=spotify_white, size=10)
            ax4.set_title('Energy vs Danceability', color=spotify_white, size=12, weight='bold')
            ax4.legend()
            ax4.grid(True, alpha=0.2, color=spotify_gray)
            ax4.tick_params(colors=spotify_white)
            ax4.set_facecolor('#1a1a1a')
        
        # 5. Bar Chart - Average Comparison
        ax5 = plt.subplot(2, 3, 5)
        metrics = ['Energy', 'Danceability', 'Valence']
        user_vals = [user_energy, user_dance, user_valence]
        rec_vals = [
            np.mean(rec_energy) if rec_energy else 0,
            np.mean(rec_dance) if rec_dance else 0,
            np.mean(rec_valence) if rec_valence else 0
        ]
        
        x = np.arange(len(metrics))
        width = 0.35
        
        bars1 = ax5.bar(x - width/2, user_vals, width, label='Your Taste', color=spotify_green, edgecolor='white', linewidth=0.5)
        bars2 = ax5.bar(x + width/2, rec_vals, width, label='Recommendations', color=rec_color, edgecolor='white', linewidth=0.5)
        
        ax5.set_ylabel('Value', color=spotify_white, size=10)
        ax5.set_title('Average Metrics Comparison', color=spotify_white, size=12, weight='bold')
        ax5.set_xticks(x)
        ax5.set_xticklabels(metrics, color=spotify_white)
        ax5.legend()
        ax5.tick_params(colors=spotify_white)
        ax5.set_facecolor('#1a1a1a')
        ax5.set_ylim(0, 1)
        
        # Add value labels on bars
        for bars in [bars1, bars2]:
            for bar in bars:
                height = bar.get_height()
                ax5.text(bar.get_x() + bar.get_width()/2., height,
                        f'{height:.2f}',
                        ha='center', va='bottom', color=spotify_white, size=8)
        
        # 6. Box Plot - Feature Distribution
        ax6 = plt.subplot(2, 3, 6)
        data_to_plot = []
        labels = []
        
        if rec_energy:
            data_to_plot.append(rec_energy)
            labels.append('Energy')
        if rec_dance:
            data_to_plot.append(rec_dance)
            labels.append('Dance')
        if rec_valence:
            data_to_plot.append(rec_valence)
            labels.append('Valence')
        
        if data_to_plot:
            bp = ax6.boxplot(data_to_plot, labels=labels, patch_artist=True,
                            boxprops=dict(facecolor=rec_color, alpha=0.7, edgecolor='white'),
                            whiskerprops=dict(color='white'),
                            capprops=dict(color='white'),
                            medianprops=dict(color=spotify_green, linewidth=2))
            
            ax6.set_ylabel('Value', color=spotify_white, size=10)
            ax6.set_title('Feature Distribution (Box Plot)', color=spotify_white, size=12, weight='bold')
            ax6.tick_params(colors=spotify_white)
            ax6.set_facecolor('#1a1a1a')
            ax6.set_ylim(0, 1)
        
        plt.tight_layout(pad=3.0)
        
        # Save to bytes buffer
        buf = BytesIO()
        plt.savefig(buf, format='png', dpi=150, facecolor='#121212', edgecolor='none')
        buf.seek(0)
        plt.close()
        
        # Encode to base64
        img_base64 = b64.b64encode(buf.getvalue()).decode('utf-8')
        
        return jsonify({
            'image': f'data:image/png;base64,{img_base64}',
            'analysis': {
                'similarity_score': calculate_similarity_score(user_vals, rec_vals),
                'energy_match': abs(user_energy - np.mean(rec_energy)) if rec_energy else 0,
                'dance_match': abs(user_dance - np.mean(rec_dance)) if rec_dance else 0,
                'valence_match': abs(user_valence - np.mean(rec_valence)) if rec_valence else 0
            }
        })
        
    except Exception as error:
        print(f'Error generating visualization: {error}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to generate visualization'}), 500

def calculate_similarity_score(user_vals, rec_vals):
    """Calculate overall similarity score between user taste and recommendations"""
    if not user_vals or not rec_vals:
        return 0
    
    # Calculate Euclidean distance
    distance = np.sqrt(sum([(u - r) ** 2 for u, r in zip(user_vals, rec_vals)]))
    
    # Convert to similarity score (0-100%)
    max_distance = np.sqrt(3)  # Maximum possible distance for 3 features in [0,1]
    similarity = (1 - (distance / max_distance)) * 100
    
    return round(similarity, 1)

# Start server
if __name__ == '__main__':
    connect_to_mongodb()
    port = int(os.getenv('PORT', 3000))
    print(f'🎵 SpotiRec server running on http://localhost:{port}')
    print(f'🔑 Make sure to set up your .env file with Spotify credentials')
    app.run(host='0.0.0.0', port=port, debug=True)
