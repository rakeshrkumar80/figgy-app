const express = require('express');
const { PubSub } = require('@google-cloud/pubsub');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;
const PROJECT_ID = process.env.GCP_PROJECT_ID || 'your-gcp-project-id'; // Replace with your GCP project ID
const NEW_ORDER_TOPIC = 'new-orders';

const pubSubClient = new PubSub({ projectId: PROJECT_ID });

// In-memory store for orders (for demonstration purposes)
const orders = {}; // orderId -> { userId, items, status, timestamp }

// Endpoint to place an order
app.post('/order', async (req, res) => {
  const { userId, items } = req.body;

  if (!userId || !items || items.length === 0) {
    return res.status(400).send('User ID and items are required.');
  }

  const orderId = uuidv4();
  const newOrder = {
    orderId,
    userId,
    items,
    status: 'PENDING',
    timestamp: new Date().toISOString(),
  };

  orders[orderId] = newOrder;

  try {
    const messageId = await pubSubClient
      .topic(NEW_ORDER_TOPIC)
      .publishMessage({ json: newOrder });
    console.log(`Message ${messageId} published to topic ${NEW_ORDER_TOPIC} for order ${orderId}`);
    res.status(202).json({
      message: 'Order received and being processed.',
      orderId: orderId,
      status: newOrder.status,
    });
  } catch (error) {
    console.error(`Received error while publishing: ${error.message}`);
    res.status(500).send('Failed to place order due to internal error.');
  }
});

// Endpoint to check order status
app.get('/status/:orderId', (req, res) => {
  const { orderId } = req.params;
  const order = orders[orderId];

  if (!order) {
    return res.status(404).send('Order not found.');
  }

  res.status(200).json(order);
});

app.get('/', (req, res) => {
  res.status(200).send('User Service is running.');
});

app.listen(PORT, () => {
  console.log(`User Service listening on port ${PORT}`);
});
