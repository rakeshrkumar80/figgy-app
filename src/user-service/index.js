const express = require('express');
const { PubSub } = require('@google-cloud/pubsub');
const { Firestore } = require('@google-cloud/firestore');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());  // Enable CORS for all domains

const PORT = process.env.PORT || 8080;
const PROJECT_ID = process.env.GCP_PROJECT_ID || 'trainocat-1773726906318'; // Replace with your GCP project ID
const NEW_ORDER_TOPIC = 'new-orders';

const pubSubClient = new PubSub({ projectId: PROJECT_ID });
const firestore = new Firestore();  // Initialize Firestore

// Endpoint to place an order
app.post('/order', async (req, res) => {
  const { userId, items } = req.body;

  // Validate input
  if (!userId || typeof userId !== 'string') {
    return res.status(400).send('Invalid User ID.');
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).send('Items must be an array and cannot be empty.');
  }

  const orderId = uuidv4();
  const newOrder = {
    orderId,
    userId,
    items,
    status: 'PENDING',
    timestamp: new Date().toISOString(),
  };

  try {
    // Save the order to Firestore
    const orderRef = firestore.collection('orders').doc(orderId);
    await orderRef.set(newOrder); // Store the order in Firestore

    // Publish the order to Pub/Sub
    const messageId = await pubSubClient
      .topic(NEW_ORDER_TOPIC)
      .publishMessage({ json: newOrder });

    console.log(`Message ${messageId} published to topic ${NEW_ORDER_TOPIC} for order ${orderId}`);

    res.status(202).json({
      message: 'Order received and being processed.',
      orderId,
      status: newOrder.status,
    });
  } catch (error) {
    console.error('Received error while publishing:', error);
    res.status(500).send('Failed to place order due to internal error.');
  }
});

// Endpoint to check order status
app.get('/status/:orderId', async (req, res) => {
  const { orderId } = req.params;

  try {
    // Retrieve the order from Firestore
    const orderSnapshot = await firestore.collection('orders').doc(orderId).get();
    if (!orderSnapshot.exists) {
      return res.status(404).send('Order not found.');
    }

    const order = orderSnapshot.data();
    res.status(200).json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).send('Failed to retrieve order.');
  }
});

// Health check endpoint (optional)
app.get('/health', (req, res) => {
  res.status(200).send('Service is healthy');
});

app.get('/', (req, res) => {
  res.status(200).send('User Service is running.');
});

app.listen(PORT, () => {
  console.log(`User Service listening on port ${PORT}`);
});