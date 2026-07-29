from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token

app = Flask(__name__)
app.config["JWT_SECRET_KEY"] = "super-secret-jwt-key"
jwt = JWTManager(app)

with app.app_context():
    token = create_access_token(identity="1", additional_claims={"role": "user"})
    print(token)
