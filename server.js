const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const aws = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 3000;

// Connect to MongoDB
mongoose.connect('mongodb://localhost/myapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('Connected to MongoDB');
});

// Define a schema for the product
const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  currency: String,
  image: String,
});

const Product = mongoose.model('Product', productSchema);

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Configure AWS SDK
const s3 = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// Define a route for creating a new product
app.post('/products', upload.single('image'), async (req, res) => {
  const { name, description, currency } = req.body;

  // Generate a unique ID for the image
  const imageId = uuidv4();

  // Upload the image to Amazon S3
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `images/${imageId}`,
    Body: req.file.buffer,
    ContentType: req.file.mimetype,
  };

  const s3Response = await s3.upload(params).promise();

  // Create a new product with the image URL
  const product = new Product({
    name,
    description,
    currency,
    image: s3Response.Location,
  });

  try {
    // Save the product to MongoDB
    await product.save();
    res.status(201).send(product);
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
});

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});
