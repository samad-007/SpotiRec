# 🎵 SpotiRec - Music Recommendation System

A beautiful, Spotify-themed web application that provides personalized music recommendations by analyzing your Spotify listening patterns and matching them with a curated MongoDB database of songs.

![SpotiRec Preview](https://img.shields.io/badge/Built%20with-Spotify%20API-1DB954?style=for-the-badge&logo=spotify)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?style=for-the-badge&logo=mongodb)
![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?style=for-the-badge&logo=node.js)

## ✨ Features

- 🔐 **Spotify OAuth Integration** - Secure login with your Spotify account
- 🎧 **Top Tracks Analysis** - View your most played songs with beautiful album art
- 🤖 **Smart Recommendations** - AI-powered music suggestions based on:
  - Your favorite artists and genres
  - Audio features (energy, danceability, valence)
  - Listening patterns
- 💾 **MongoDB Integration** - Recommendations from your custom song database
- 🎨 **Aesthetic UI** - Beautiful Spotify-themed interface with smooth animations
- 📱 **Fully Responsive** - Works perfectly on desktop, tablet, and mobile

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Spotify Developer Account
- MongoDB Atlas Account (or local MongoDB instance)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd spotirec
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and fill in your actual credentials (see Configuration section below)

4. **Set up Spotify API**
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Create a new application
   - After creation, go to Settings and add `http://127.0.0.1:3000/callback` to Redirect URIs
   - Copy your Client ID and Client Secret and add them to `.env`

5. **Set up MongoDB Atlas**
   - Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a database (e.g., `recommender`)
   - Create a collection for your songs (e.g., `songs`)
   - Get your connection string and add it to `.env`

6. **Populate your MongoDB database**
   
   Your MongoDB collection should have documents with this structure:
   ```json
   {
     "Artist": "The Weeknd",
     "Track": "Blinding Lights",
     "Album": "After Hours",
     "Energy": 0.73,
     "Danceability": 0.51,
     "Valence": 0.33,
     "Loudness": -5.934,
     "Acousticness": 0.001,
     "Liveness": 0.0897,
     "Album_type": "album"
   }
   ```
   
   **Important:** Field names are case-sensitive! Use capitalized field names as shown above.

   Example songs to add:
   ```javascript
   // Connect to your MongoDB and insert sample data
   db.songs.insertMany([
     {
       "title": "Blinding Lights",
       "artist": "The Weeknd",
       "album": "After Hours",
       "genre": "Synth-pop",
       "year": 2019,
       "energy": 0.73,
       "danceability": 0.514,
       "valence": 0.334
     },
     {
       "title": "Levitating",
       "artist": "Dua Lipa",
       "album": "Future Nostalgia",
       "genre": "Pop",
7. **Run the application**
   ```bash
   npm run dev
   ```
   
   Or for production:
   ```bash
   npm start
   ```

8. **Open your browser**
   
   Navigate to `http://localhost:3000`

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Spotify API Credentials
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/callback

# MongoDB Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name?retryWrites=true&w=majority

# Session Secret (any random string)
SESSION_SECRET=your_random_secret_string

# Server Port
PORT=3000
```

**Security Note:** Never commit your `.env` file to version control. It contains sensitive credentials!

## 📁 Project Structure

```
spotirec/
├── server/
│   └── index.js          # Express server with Spotify OAuth & MongoDB
├── public/
│   ├── styles.css        # Spotify-themed styling
│   └── app.js           # Frontend JavaScript logic
├── index.html           # Main HTML file
├── package.json         # Dependencies and scripts
├── .env.example        # Environment variables template
├── .gitignore          # Git ignore file
└── README.md           # This file
```

## 🎨 Features Breakdown

### Login Screen
- Animated Spotify-style landing page
- Feature highlights
- Secure OAuth flow

### Dashboard
- User profile with avatar
- Real-time statistics
- Top tracks grid with album artwork
- Personalized recommendations

### Recommendation Engine
The system analyzes:
- **Top Artists**: Your most listened-to artists
- **Top Genres**: Musical genres you prefer
- **Audio Features**:
  - Energy: How energetic the music is (0-100%)
  - Danceability: How suitable for dancing (0-100%)
  - Valence: Musical positivity/mood (Happy, Upbeat, Calm, Melancholic)

## 🛠️ Technologies Used

- **Backend**: Node.js, Express
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Database**: MongoDB Atlas
- **API**: Spotify Web API
- **Authentication**: OAuth 2.0
- **Styling**: Custom CSS with Spotify Design System

## 🔒 Security Notes

- Never commit your `.env` file
- Keep your Spotify Client Secret secure
- Use HTTPS in production
- Set `cookie.secure: true` in production
- Regularly rotate your SESSION_SECRET

## 📊 MongoDB Schema

Your songs collection should follow this schema for optimal recommendations:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Artist | String | Yes | Artist name (case-sensitive!) |
| Track | String | Yes | Song title |
| Album | String | Yes | Album name |
| Album_type | String | No | Type of album (album, single, etc.) |
| Energy | Number (0-1) | Yes | Energy level (0.0 = low, 1.0 = high) |
| Danceability | Number (0-1) | Yes | Danceability score (0.0 = not danceable, 1.0 = very danceable) |
| Valence | Number (0-1) | Yes | Musical positivity (0.0 = sad, 1.0 = happy) |
| Loudness | Number | No | Track loudness in dB |
| Acousticness | Number (0-1) | No | Acoustic vs. electronic (0.0 = electronic, 1.0 = acoustic) |
| Liveness | Number (0-1) | No | Presence of audience (0.0 = studio, 1.0 = live) |

**Important Note:** Field names are **case-sensitive**! Use capitalized first letters (Artist, Track, Album, Energy, etc.) as shown above.

## 🚧 Troubleshooting

### "No recommendations found"
- Make sure your MongoDB collection has songs
- Verify your MongoDB connection string
- Check that song documents have the correct fields

### "Failed to fetch user profile"
- Verify your Spotify credentials in `.env`
- Check that redirect URI matches your Spotify app settings (use `http://127.0.0.1:3000/callback`)
- Ensure you've logged in successfully
- Try logging out and logging in again

### "redirect_uri_mismatch" error
- The redirect URI in `.env` must EXACTLY match what's in Spotify Dashboard
- Use `http://127.0.0.1:3000/callback` (NOT `http://localhost:3000/callback`)
- Make sure to add the redirect URI in Spotify Dashboard Settings AFTER creating the app

### "Cannot connect to MongoDB"
- Verify your MongoDB connection string
- Check that your IP is whitelisted in MongoDB Atlas
- Ensure your database user has proper permissions

## 🎯 Future Enhancements

- [ ] Playlist creation from recommendations
- [ ] Save favorite recommendations
- [ ] Share recommendations with friends
- [ ] Advanced filtering options
- [ ] Recently played tracks analysis
- [ ] Mood-based recommendations
- [ ] Export recommendations to Spotify

## 📝 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 💡 Tips for Best Results

1. **Populate your database** with diverse songs across genres
2. **Include audio features** (energy, danceability, valence) for better matching
3. **Listen to music on Spotify** regularly to build a better profile
4. **Keep genres consistent** in your database for accurate recommendations

## 📧 Support

If you encounter any issues or have questions, please open an issue on GitHub.

---

Made with ❤️ and 🎵 by leveraging Spotify's powerful API and MongoDB's flexible database.
