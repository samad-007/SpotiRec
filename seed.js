// MongoDB Seed Script
// This script helps you populate your MongoDB database with sample songs
// Run this after setting up your MongoDB Atlas cluster

const { MongoClient } = require('mongodb');
require('dotenv').config();

// Sample songs with realistic audio features
const sampleSongs = [
  {
    title: "Blinding Lights",
    artist: "The Weeknd",
    album: "After Hours",
    genre: "Synth-pop",
    year: 2019,
    energy: 0.73,
    danceability: 0.514,
    valence: 0.334
  },
  {
    title: "Levitating",
    artist: "Dua Lipa",
    album: "Future Nostalgia",
    genre: "Pop",
    year: 2020,
    energy: 0.825,
    danceability: 0.702,
    valence: 0.915
  },
  {
    title: "Watermelon Sugar",
    artist: "Harry Styles",
    album: "Fine Line",
    genre: "Pop Rock",
    year: 2019,
    energy: 0.816,
    danceability: 0.548,
    valence: 0.557
  },
  {
    title: "Shape of You",
    artist: "Ed Sheeran",
    album: "÷ (Divide)",
    genre: "Pop",
    year: 2017,
    energy: 0.652,
    danceability: 0.825,
    valence: 0.931
  },
  {
    title: "Someone Like You",
    artist: "Adele",
    album: "21",
    genre: "Pop Soul",
    year: 2011,
    energy: 0.402,
    danceability: 0.602,
    valence: 0.234
  },
  {
    title: "Bohemian Rhapsody",
    artist: "Queen",
    album: "A Night at the Opera",
    genre: "Rock",
    year: 1975,
    energy: 0.471,
    danceability: 0.318,
    valence: 0.216
  },
  {
    title: "Don't Stop Me Now",
    artist: "Queen",
    album: "Jazz",
    genre: "Rock",
    year: 1978,
    energy: 0.877,
    danceability: 0.577,
    valence: 0.941
  },
  {
    title: "Billie Jean",
    artist: "Michael Jackson",
    album: "Thriller",
    genre: "Pop",
    year: 1982,
    energy: 0.819,
    danceability: 0.936,
    valence: 0.425
  },
  {
    title: "Smells Like Teen Spirit",
    artist: "Nirvana",
    album: "Nevermind",
    genre: "Grunge",
    year: 1991,
    energy: 0.912,
    danceability: 0.502,
    valence: 0.311
  },
  {
    title: "Hotel California",
    artist: "Eagles",
    album: "Hotel California",
    genre: "Rock",
    year: 1976,
    energy: 0.514,
    danceability: 0.552,
    valence: 0.395
  },
  {
    title: "Thriller",
    artist: "Michael Jackson",
    album: "Thriller",
    genre: "Pop",
    year: 1982,
    energy: 0.665,
    danceability: 0.719,
    valence: 0.444
  },
  {
    title: "Sweet Child O' Mine",
    artist: "Guns N' Roses",
    album: "Appetite for Destruction",
    genre: "Hard Rock",
    year: 1987,
    energy: 0.932,
    danceability: 0.481,
    valence: 0.619
  },
  {
    title: "Imagine",
    artist: "John Lennon",
    album: "Imagine",
    genre: "Soft Rock",
    year: 1971,
    energy: 0.316,
    danceability: 0.484,
    valence: 0.261
  },
  {
    title: "Stairway to Heaven",
    artist: "Led Zeppelin",
    album: "Led Zeppelin IV",
    genre: "Rock",
    year: 1971,
    energy: 0.317,
    danceability: 0.343,
    valence: 0.225
  },
  {
    title: "Rolling in the Deep",
    artist: "Adele",
    album: "21",
    genre: "Pop Soul",
    year: 2010,
    energy: 0.789,
    danceability: 0.747,
    valence: 0.171
  },
  {
    title: "Uptown Funk",
    artist: "Mark Ronson ft. Bruno Mars",
    album: "Uptown Special",
    genre: "Funk Pop",
    year: 2014,
    energy: 0.842,
    danceability: 0.896,
    valence: 0.930
  },
  {
    title: "Happy",
    artist: "Pharrell Williams",
    album: "Girl",
    genre: "Pop",
    year: 2013,
    energy: 0.822,
    danceability: 0.647,
    valence: 0.960
  },
  {
    title: "Lose Yourself",
    artist: "Eminem",
    album: "8 Mile Soundtrack",
    genre: "Hip Hop",
    year: 2002,
    energy: 0.824,
    danceability: 0.741,
    valence: 0.439
  },
  {
    title: "Crazy in Love",
    artist: "Beyoncé ft. Jay-Z",
    album: "Dangerously in Love",
    genre: "R&B",
    year: 2003,
    energy: 0.895,
    danceability: 0.693,
    valence: 0.802
  },
  {
    title: "Thinking Out Loud",
    artist: "Ed Sheeran",
    album: "x (Multiply)",
    genre: "Pop Soul",
    year: 2014,
    energy: 0.440,
    danceability: 0.777,
    valence: 0.547
  },
  {
    title: "Shallow",
    artist: "Lady Gaga & Bradley Cooper",
    album: "A Star Is Born",
    genre: "Pop Rock",
    year: 2018,
    energy: 0.566,
    danceability: 0.726,
    valence: 0.377
  },
  {
    title: "Old Town Road",
    artist: "Lil Nas X",
    album: "7",
    genre: "Country Rap",
    year: 2019,
    energy: 0.619,
    danceability: 0.873,
    valence: 0.533
  },
  {
    title: "bad guy",
    artist: "Billie Eilish",
    album: "When We All Fall Asleep, Where Do We Go?",
    genre: "Electropop",
    year: 2019,
    energy: 0.434,
    danceability: 0.703,
    valence: 0.564
  },
  {
    title: "Sunflower",
    artist: "Post Malone & Swae Lee",
    album: "Spider-Man: Into the Spider-Verse",
    genre: "Hip Hop",
    year: 2018,
    energy: 0.762,
    danceability: 0.760,
    valence: 0.913
  },
  {
    title: "Havana",
    artist: "Camila Cabello",
    album: "Camila",
    genre: "Pop",
    year: 2017,
    energy: 0.765,
    danceability: 0.765,
    valence: 0.394
  },
  {
    title: "Despacito",
    artist: "Luis Fonsi & Daddy Yankee",
    album: "Vida",
    genre: "Latin Pop",
    year: 2017,
    energy: 0.816,
    danceability: 0.653,
    valence: 0.822
  },
  {
    title: "Perfect",
    artist: "Ed Sheeran",
    album: "÷ (Divide)",
    genre: "Pop",
    year: 2017,
    energy: 0.302,
    danceability: 0.599,
    valence: 0.165
  },
  {
    title: "Someone You Loved",
    artist: "Lewis Capaldi",
    album: "Divinely Uninspired to a Hellish Extent",
    genre: "Pop",
    year: 2018,
    energy: 0.405,
    danceability: 0.503,
    valence: 0.446
  },
  {
    title: "Circles",
    artist: "Post Malone",
    album: "Hollywood's Bleeding",
    genre: "Pop",
    year: 2019,
    energy: 0.762,
    danceability: 0.695,
    valence: 0.553
  },
  {
    title: "Dance Monkey",
    artist: "Tones and I",
    album: "The Kids Are Coming",
    genre: "Electropop",
    year: 2019,
    energy: 0.598,
    danceability: 0.824,
    valence: 0.513
  }
];

async function seedDatabase() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    
    const db = client.db();
    const songsCollection = db.collection('songs');
    
    // Check if collection already has data
    const count = await songsCollection.countDocuments();
    
    if (count > 0) {
      console.log(`⚠️  Collection already has ${count} songs.`);
      console.log('Do you want to:');
      console.log('1. Add these songs anyway (duplicates possible)');
      console.log('2. Clear and replace all songs');
      console.log('3. Skip seeding');
      console.log('\nEdit this script to implement your choice, or manually delete the collection.');
      
      // For safety, we'll just add without clearing
      console.log('\n📝 Adding songs to existing collection...');
    } else {
      console.log('📝 Collection is empty. Adding sample songs...');
    }
    
    // Insert the sample songs
    const result = await songsCollection.insertMany(sampleSongs);
    console.log(`✅ Successfully inserted ${result.insertedCount} songs!`);
    
    // Display summary
    const totalCount = await songsCollection.countDocuments();
    const genres = await songsCollection.distinct('genre');
    const artists = await songsCollection.distinct('artist');
    
    console.log('\n📊 Database Summary:');
    console.log(`   Total Songs: ${totalCount}`);
    console.log(`   Unique Genres: ${genres.length}`);
    console.log(`   Unique Artists: ${artists.length}`);
    console.log(`   Genres: ${genres.join(', ')}`);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the seed function
seedDatabase();
