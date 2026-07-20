import os
from pypdf import PdfReader

def parse_file(file_path: str) -> str:
    """Parses a text or PDF file and returns its content as a string."""
    ext = os.path.splitext(file_path)[1].lower()
    
    if ext == ".txt":
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    elif ext == ".pdf":
        text = ""
        try:
            reader = PdfReader(file_path)
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
        except Exception as e:
            return f"Error reading PDF: {str(e)}"
        return text
    else:
        raise ValueError("Unsupported file format. Please upload TXT or PDF.")
