# ============================================================
# IMPORT LIBRARIES AND BACKEND FUNCTION
# ============================================================
"""
# Path helps build file and directory paths safely.
# traceback helps display detailed error information while debugging.
# Uvicorn runs the FastAPI application as an ASGI web server.
"""
from pathlib import Path
import traceback
import uvicorn

# ------------------------------------------------------------
# FASTAPI IMPORTS
# ------------------------------------------------------------
"""
# FastAPI creates the web application and API endpoints.
# HTMLResponse sends HTML content to the browser.
# JSONResponse sends JSON-formatted response.
# StaticFiles serves frontend assets such as CSS, JavaScript, and images.
# Jinja2Templates renders HTML templates with dynamic data.
"""
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

# ------------------------------------------------------------
# REQUEST DATA VALIDATION
# ------------------------------------------------------------
"""
# BaseModel lets us define and validate the structure of API request data.
"""
from pydantic import BaseModel

# ------------------------------------------------------------
# IMPORT THE TRIPMATE AI BACKEND
# ------------------------------------------------------------
"""
# Import the function that executes the LangGraph travel-planning workflow.
"""
from backend import run_travel_agent

# ---------------------------------------------------------------
# This is to allow nested event loops for async calls in FastAPI
# ---------------------------------------------------------------
import nest_asyncio
nest_asyncio.apply()

# ============================================================
# INITIALIZE FASTAPI AND CONFIGURE FRONTEND FILES
# ============================================================
"""
# Get the absolute path of the directory containing this app.py file.
# Example: C:\project\travel-multi-agent
"""
BASE_DIR = Path(__file__).resolve().parent

# ------------------------------------------------------------
# CREATE THE FASTAPI APPLICATION
# ------------------------------------------------------------
"""
# Initialize the FastAPI application.
# Application name shown in API documentation
# API version displayed in documentation
"""
app = FastAPI(
    title="trip-mate-ai",
    description="LangGraph Multi-Agent Travel Planner with FASTAPI Frontend",
    version="1.0.0"
)

# ------------------------------------------------------------
# CONFIGURE STATIC FILES
# ------------------------------------------------------------
"""
# Make files inside the project's "static" directory accessible
# through URLs beginning with /static.
#
# Example:
# static/style.css -> http://127.0.0.1:8000/static/style.css
"""

app.mount(
    "/static",
    StaticFiles(directory=str(BASE_DIR / "static")),
    name="static"
)

# ------------------------------------------------------------
# CONFIGURE HTML TEMPLATES
# ------------------------------------------------------------
"""
# Tell FastAPI where to find the HTML templates.
# Routes can use this object to render HTML pages with dynamic data.
"""

templates = Jinja2Templates(
    directory=str(BASE_DIR / "templates")
)

# Define the structure and validation rules for a travel request.
class TravelRequest(BaseModel):
    """
    # The user's travel question or planning requirements.
    # Example: "Plan a 5-day trip to Japan."
    # This field is required.
    
    # The ID of the existing conversation.
    # Used to associate a request with a LangGraph thread.
    # This field is optional and defaults to None.
    thread_id: str | None = None
    """
    message: str
    thread_id: str | None = None

# ============================================================
# HOME PAGE ROUTE
# ============================================================
"""
# Register a GET endpoint for the root URL "/".
# When a user opens http://127.0.0.1:8000/,
# FastAPI executes this function.
# Render the index.html template and return it as HTML.
# Pass the current HTTP request to the template engine.
# Name of the HTML file inside the templates directory.
# Expected path: templates/index.html
# Data passed from Python to the HTML template.
# Empty because this page currently needs no dynamic data.
"""
@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={}
    )

# ============================================================
# TRAVEL PLANNER API ENDPOINT
# ============================================================
"""
# Register a POST API endpoint at /api/travel.
# The frontend sends the user's travel request to this URL.
"""

@app.post("/api/travel")
async def travel_planner(request_data: TravelRequest):
    try:
        # ----------------------------------------------------
        # 1. READ AND CLEAN THE USER'S MESSAGE
        # ----------------------------------------------------
        """
        # Extract the message from the validated request body.
        # strip() removes spaces and newline characters from
        # the beginning and end of the message.
        """
        user_message = request_data.message.strip()

        # ----------------------------------------------------
        # 2. VALIDATE THE USER'S MESSAGE
        # ----------------------------------------------------
        """
        # Reject the request if the message is empty or contains
        # only whitespace characters.
        # Return an HTTP 400 Bad Request response.
        # Send an error response in JSON format.
        """
        
        if not user_message:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "Message cannot be empty."
                }
            )

        # ----------------------------------------------------
        # 3. CALL THE LANGGRAPH BACKEND
        # ----------------------------------------------------
        """
        # Send the cleaned message and optional conversation
        # thread ID to the travel-agent workflow.
        """
        
        result = run_travel_agent(
            user_input=user_message,
            thread_id=request_data.thread_id
        )

        # ----------------------------------------------------
        # 4. RETURN THE GENERATED TRAVEL PLAN
        # ----------------------------------------------------
        """
        # Convert the backend result into a JSON response.
        # Indicates that the request completed successfully.
        # Identifies the conversation thread.
        # Complete answer generated by the travel agent.
        # Information returned by the flight agent.
        # Information returned by the hotel agent.
        # Itinerary prepared by the itinerary agent.
        # Number of LLM calls reported by the backend.
        """
        
        return JSONResponse(
            content={
                "success": True,
                "thread_id": result["thread_id"],
                "answer": result["answer"],
                "flight_results": result["flight_results"],
                "hotel_results": result["hotel_results"],
                "itinerary": result["itinerary"],
                "llm_calls": result["llm_calls"],
            }
        )

    # --------------------------------------------------------
    # 5. HANDLE UNEXPECTED ERRORS
        # Print a short error message in the server terminal.
        # Print the full traceback to help debug the issue.
        # Return HTTP 500 when an unexpected server-side error
        # prevents the travel plan from being generated.
    # --------------------------------------------------------
    
    except Exception as e:
        print("ERROR:", e)
        traceback.print_exc()

        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e)
            }
        )

# ============================================================
# HEALTH CHECK ENDPOINT
# ============================================================
@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "message": "AI Travel Planner API is running"
    }

# ============================================================
# FAVICON ENDPOINT
# ============================================================
@app.get("/favicon.ico")
async def favicon():
    return JSONResponse(content={})


# ============================================================
# START THE FASTAPI APPLICATION
# ============================================================
"""
# Execute this block only when app.py is run directly.
# It will not execute when another Python module imports app.py.
# Start the Uvicorn ASGI server.
# Import the FastAPI instance named "app" from app.py.
# Listen only on this computer.
# Automatically reload the server when code changes.
# Intended for local development, not production.
"""
if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )