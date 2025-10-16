require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const axios = require('axios');
const { MongoClient } = require('mongodb');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Connection
let db;
let songsCollection;

async function connectToMongoDB() {
  try {
    const client = await MongoClient.connect(process.env.MONGODB_URI);
    db = client.db('recommender'); // Your database name
    songsCollection = db.collection('cleaned_copy3'); // Your collection name
    
    // Log connection details
    console.log('✅ Connected to MongoDB Atlas');
    console.log('📊 Database: recommender');
    console.log('📁 Collection: cleaned_copy3');
    
    // Check if collection has documents
    const count = await songsCollection.countDocuments();
    console.log(`🎵 Found ${count} songs in collection`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true if using HTTPS
}));

// Spotify API Configuration
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

// Routes

// Home route - serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// Login route - redirect to Spotify authorization
app.get('/login', (req, res) => {
  const scope = 'user-read-private user-read-email user-top-read user-read-recently-played';
  const authURL = `https://accounts.spotify.com/authorize?` +
    `response_type=code&client_id=${SPOTIFY_CLIENT_ID}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&redirect_uri=${encodeURIComponent(SPOTIFY_REDIRECT_URI)}`;
  res.redirect(authURL);
});

// Callback route - handle Spotify OAuth callback
app.get('/callback', async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.redirect('/?error=no_code');
  }

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: SPOTIFY_REDIRECT_URI,
      }),
      {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    req.session.accessToken = tokenResponse.data.access_token;
    req.session.refreshToken = tokenResponse.data.refresh_token;
    res.redirect('/?auth=success');
  } catch (error) {
    console.error('Error getting access token:', error.response?.data || error);
    res.redirect('/?error=auth_failed');
  }
});

// Get user profile
app.get('/api/user', async (req, res) => {
  if (!req.session.accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const response = await axios.get('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${req.session.accessToken}` }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching user profile:', error.response?.data || error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Get user's top tracks
app.get('/api/top-tracks', async (req, res) => {
  if (!req.session.accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const response = await axios.get('https://api.spotify.com/v1/me/top/tracks', {
      headers: { 'Authorization': `Bearer ${req.session.accessToken}` },
      params: { limit: 20, time_range: 'medium_term' }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching top tracks:', error.response?.data || error);
    res.status(500).json({ error: 'Failed to fetch top tracks' });
  }
});

// Get recommendations from MongoDB based on user's listening pattern
app.get('/api/recommendations', async (req, res) => {
  if (!req.session.accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    // Try different time ranges to get user's top tracks
    let topTracks = [];
    let timeRangeUsed = '';
    
    // Try short_term first (last 4 weeks)
    try {
      const shortTermResponse = await axios.get('https://api.spotify.com/v1/me/top/tracks', {
        headers: { 'Authorization': `Bearer ${req.session.accessToken}` },
        params: { limit: 20, time_range: 'short_term' }
      });
      topTracks = shortTermResponse.data.items;
      timeRangeUsed = 'short_term (last 4 weeks)';
    } catch (err) {
      console.log('⚠️  No short_term data available');
    }
    
    // If no short_term data, try medium_term (last 6 months)
    if (!topTracks || topTracks.length === 0) {
      try {
        const mediumTermResponse = await axios.get('https://api.spotify.com/v1/me/top/tracks', {
          headers: { 'Authorization': `Bearer ${req.session.accessToken}` },
          params: { limit: 20, time_range: 'medium_term' }
        });
        topTracks = mediumTermResponse.data.items;
        timeRangeUsed = 'medium_term (last 6 months)';
      } catch (err) {
        console.log('⚠️  No medium_term data available');
      }
    }
    
    // If still no data, try long_term (several years)
    if (!topTracks || topTracks.length === 0) {
      try {
        const longTermResponse = await axios.get('https://api.spotify.com/v1/me/top/tracks', {
          headers: { 'Authorization': `Bearer ${req.session.accessToken}` },
          params: { limit: 20, time_range: 'long_term' }
        });
        topTracks = longTermResponse.data.items;
        timeRangeUsed = 'long_term (all time)';
      } catch (err) {
        console.log('⚠️  No long_term data available');
      }
    }
    
    // Check if user has any top tracks across all time ranges
    if (!topTracks || topTracks.length === 0) {
      console.log('⚠️  User has NO listening history across all time ranges');
      console.log('⚠️  Returning random recommendations - user needs to listen to music on Spotify first!');
      const randomRecommendations = await songsCollection.aggregate([
        { $sample: { size: 20 } }
      ]).toArray();
      
      return res.json({
        recommendations: randomRecommendations,
        userPreferences: {
          topArtists: [],
          topGenres: [],
          avgEnergy: 0.5,
          avgDanceability: 0.5,
          avgValence: 0.5
        },
        message: 'No listening history found. Please listen to music on Spotify to get personalized recommendations!'
      });
    }
    
    console.log(`✅ Found ${topTracks.length} top tracks using ${timeRangeUsed}`);
    console.log(`🎵 Sample tracks: ${topTracks.slice(0, 3).map(t => `"${t.name}" by ${t.artists[0].name}`).join(', ')}`)
    
    // Extract genres and artists from top tracks
    const topArtists = [...new Set(topTracks.flatMap(track => track.artists.map(a => a.name)))];
    const topGenres = [...new Set(topTracks.flatMap(track => track.artists.flatMap(a => a.genres || [])))];
    
    console.log(`🎤 Your top artists: ${topArtists.slice(0, 5).join(', ')}`);
    
    // Find matching songs in MongoDB by artist first
    const artistMatches = await songsCollection.find({
      Artist: { $in: topArtists }
    }).limit(100).toArray();
    
    console.log(`📊 Found ${artistMatches.length} songs in database by your favorite artists`);
    
    // Calculate average audio features from the artist matches in our database
    let avgEnergy = 0.6; // default values
    let avgDanceability = 0.6;
    let avgValence = 0.6;
    
    if (artistMatches.length > 0) {
      // Use the audio features from songs by artists you like
      avgEnergy = artistMatches.reduce((sum, s) => sum + (s.Energy || 0.6), 0) / artistMatches.length;
      avgDanceability = artistMatches.reduce((sum, s) => sum + (s.Danceability || 0.6), 0) / artistMatches.length;
      avgValence = artistMatches.reduce((sum, s) => sum + (s.Valence || 0.6), 0) / artistMatches.length;
      
      console.log(`🎵 Calculated preferences from ${artistMatches.length} matching songs in database`);
    } else {
      console.log(`⚠️  No matching artists in database, using default audio feature values`);
    }

    // Query MongoDB for recommendations
    // Your collection has fields: Artist, Track, Album, Danceability, Energy, Valence, etc.
    console.log('🎯 Generating recommendations with preferences:', {
      topArtists: topArtists.slice(0, 5),
      avgEnergy: avgEnergy.toFixed(2),
      avgDanceability: avgDanceability.toFixed(2),
      avgValence: avgValence.toFixed(2)
    });

    if (!songsCollection) {
      console.error('❌ MongoDB collection not initialized!');
      return res.status(500).json({ error: 'Database not connected' });
    }

    // Use aggregation pipeline for better matching and scoring
    const recommendations = await songsCollection.aggregate([
      {
        $match: {
          $or: [
            // Priority 1: Match by artist (exact match)
            { Artist: { $in: topArtists } },
            // Priority 2: Match by similar audio features (wider range for better results)
            { 
              $and: [
                { Energy: { $gte: avgEnergy - 0.3, $lte: avgEnergy + 0.3 } },
                { Danceability: { $gte: avgDanceability - 0.3, $lte: avgDanceability + 0.3 } }
              ]
            },
            // Priority 3: Match by valence (mood)
            { Valence: { $gte: avgValence - 0.3, $lte: avgValence + 0.3 } }
          ]
        }
      },
      {
        // Add a score field to rank recommendations
        $addFields: {
          score: {
            $add: [
              // Artist match gets highest score (10 points)
              { $cond: [{ $in: ['$Artist', topArtists] }, 10, 0] },
              // Energy similarity (up to 5 points)
              { $multiply: [
                5,
                { $subtract: [
                  1,
                  { $abs: { $subtract: ['$Energy', avgEnergy] } }
                ]}
              ]},
              // Danceability similarity (up to 5 points)
              { $multiply: [
                5,
                { $subtract: [
                  1,
                  { $abs: { $subtract: ['$Danceability', avgDanceability] } }
                ]}
              ]},
              // Valence similarity (up to 3 points)
              { $multiply: [
                3,
                { $subtract: [
                  1,
                  { $abs: { $subtract: ['$Valence', avgValence] } }
                ]}
              ]}
            ]
          }
        }
      },
      { $sort: { score: -1 } }, // Sort by best matches first
      { $limit: 20 }
    ]).toArray();

    console.log(`✅ Found ${recommendations.length} personalized recommendations`);
    
    if (recommendations.length > 0) {
      console.log(`🎵 Top recommendation: "${recommendations[0].Track}" by ${recommendations[0].Artist} (score: ${recommendations[0].score?.toFixed(1)})`);
      const artistMatches = recommendations.filter(r => topArtists.includes(r.Artist)).length;
      console.log(`🎯 ${artistMatches} recommendations match your favorite artists`);
    }
    
    // If we didn't find enough recommendations, supplement with random ones
    if (recommendations.length < 10) {
      console.log(`⚠️  Only found ${recommendations.length} matches, adding random songs to reach 20`);
      const existingIds = recommendations.map(r => r._id);
      const additionalSongs = await songsCollection.aggregate([
        { $match: { _id: { $nin: existingIds } } },
        { $sample: { size: 20 - recommendations.length } }
      ]).toArray();
      recommendations.push(...additionalSongs);
    }

    res.json({
      recommendations,
      userPreferences: {
        topArtists: topArtists.slice(0, 5),
        topGenres: topGenres.slice(0, 5),
        avgEnergy,
        avgDanceability,
        avgValence
      }
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Check authentication status
app.get('/api/auth-status', (req, res) => {
  res.json({ authenticated: !!req.session.accessToken });
});

// Start server
connectToMongoDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🎵 SpotiRec server running on http://localhost:${PORT}`);
    console.log(`🔑 Make sure to set up your .env file with Spotify credentials`);
  });
});
