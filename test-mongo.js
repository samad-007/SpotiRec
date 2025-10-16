require('dotenv').config();
const { MongoClient } = require('mongodb');

async function testMongo() {
  try {
    const client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db('recommender');
    const collection = db.collection('cleaned_copy3');
    
    console.log('✅ Connected to MongoDB');
    
    // Get total count
    const count = await collection.countDocuments();
    console.log(`\n📊 Total documents: ${count}`);
    
    // Get a sample document to see the structure
    const sample = await collection.findOne();
    console.log('\n📝 Sample document structure:');
    console.log(JSON.stringify(sample, null, 2));
    
    // Get all field names
    const allDocs = await collection.find().limit(10).toArray();
    const allFields = new Set();
    allDocs.forEach(doc => {
      Object.keys(doc).forEach(key => allFields.add(key));
    });
    console.log('\n�� Available fields in collection:');
    console.log(Array.from(allFields).sort().join(', '));
    
    await client.close();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testMongo();
