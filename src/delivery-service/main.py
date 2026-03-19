import base64
import json
import os
import time
import random
from datetime import datetime, timedelta

from google.cloud import pubsub_v1

PROJECT_ID = os.environ.get('GCP_PROJECT_ID', 'your-gcp-project-id') # Replace with your GCP project ID
ORDER_UPDATES_TOPIC = 'order-updates'

publisher = pubsub_v1.PublisherClient()
topic_path = publisher.topic_path(PROJECT_ID, ORDER_UPDATES_TOPIC)

def process_order_updates(event, context):
    """Triggered by a Pub/Sub message."""
    if 'data' in event:
        order_update = json.loads(base64.b64decode(event['data']).decode('utf-8'))
        print(f"Received order update: {order_update['orderId']} with status {order_update['status']}")

        order_id = order_update['orderId']
        user_id = order_update['userId']
        current_status = order_update['status']

        if current_status == 'ACCEPTED':
            # Simulate assigning a delivery agent
            delivery_agent = f"Agent-{random.randint(100, 999)}"
            print(f"Assigning delivery agent {delivery_agent} for order {order_id}")

            # Publish 'ASSIGNED' status
            assigned_update = {
                'orderId': order_id,
                'userId': user_id,
                'status': 'ASSIGNED',
                'message': f'Delivery agent {delivery_agent} assigned.',
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'deliveryAgent': delivery_agent
            }
            publish_update(order_id, assigned_update)

            # Simulate delivery process (e.g., in 2 stages)
            # Stage 1: Out for Delivery
            time.sleep(random.randint(5, 10)) # Simulate travel time
            out_for_delivery_update = {
                'orderId': order_id,
                'userId': user_id,
                'status': 'OUT_FOR_DELIVERY',
                'message': 'Your order is out for delivery!',
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'deliveryAgent': delivery_agent
            }
            publish_update(order_id, out_for_delivery_update)

            # Stage 2: Delivered
            time.sleep(random.randint(5, 10)) # Simulate remaining travel time
            delivered_update = {
                'orderId': order_id,
                'userId': user_id,
                'status': 'DELIVERED',
                'message': 'Your order has been delivered!',
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'deliveryAgent': delivery_agent
            }
            publish_update(order_id, delivered_update)
        elif current_status == 'REJECTED':
            print(f"Order {order_id} was rejected, no delivery action needed.")
        # else:
        #     # Handle other statuses if necessary
        #     print(f"Order {order_id} status {current_status} received, no action taken by delivery service.")
    else:
        print("No data in event.")

def publish_update(order_id, update_data):
    try:
        future = publisher.publish(topic_path, json.dumps(update_data).encode('utf-8'))
        message_id = future.result()
        print(f"Order update for {order_id} published with status {update_data['status']}. Message ID: {message_id}")
    except Exception as e:
        print(f"Error publishing order update for {order_id}: {e}")
