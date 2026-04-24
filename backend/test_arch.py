import requests
import json
import time

url = "http://localhost:5000/api/generate"
headers = {"Content-Type": "application/json"}

prompts = [
    "Microservices E-commerce architecture with AWS API Gateway, 3 microservices (auth, catalog, order), Redis cache, and Postgres DBs.",
    "Real-time data pipeline with Kafka, Spark Streaming, HDFS, and a dashboard frontend.",
    "Serverless web application with AWS Lambda, DynamoDB, S3 for static hosting, and CloudFront.",
    "Machine Learning inference pipeline with REST API, Load Balancer, GPU compute nodes, and Model Registry.",
    "Hybrid cloud deployment with on-premise Active Directory and Cloud-based web servers connecting via VPN gateway.",
    "Event-driven architecture with EventBridge, SQS queues, SNS notifications, and multiple consumer services.",
    "Multi-tier web application architecture with Nginx reverse proxy, React frontend, Node.js backend, and MongoDB cluster.",
    "Game server architecture with matchmaking service, regional game servers, player database, and analytics pipeline."
]

for i, prompt in enumerate(prompts):
    print(f"\n--- Testing Prompt {i+1} ---")
    print(f"Prompt: {prompt}")
    data = {"prompt": prompt, "diagramType": "architecture"}
    
    try:
        start_time = time.time()
        response = requests.post(url, headers=headers, json=data, timeout=30)
        response.raise_for_status()
        result = response.json()
        print(f"Time taken: {time.time() - start_time:.2f}s")
        print("Mermaid Code:")
        print(result.get("mermaid_code", "NO CODE RETURNED"))
    except Exception as e:
        print(f"Error: {e}")
        try:
            print("Response text:", response.text)
        except:
            pass
