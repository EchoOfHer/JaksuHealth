from fastapi import FastAPI

app = FastAPI(title="JaksuHealth API")

@app.get("/")
def read_root():
    return {"message": "Welcome to JaksuHealth Backend! 👁️"}