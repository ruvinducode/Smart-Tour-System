from dotenv import load_dotenv
load_dotenv()

from app import create_app


app = create_app()

if __name__ == "__main__":
    # Never debug=True here: Flask's interactive debugger allows arbitrary code
    # execution to anyone who can trigger a 500 and knows/brute-forces the PIN.
    # Production always runs via gunicorn (which imports `app` without hitting
    # this block), but a future "let me just run this real quick" shouldn't be
    # able to expose it by accident.
    app.run(port=5001, debug=False)