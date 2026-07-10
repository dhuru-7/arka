import PyPDF2
import sys
import os

pdf_name = sys.argv[1] if len(sys.argv) > 1 else 'XY charts arka generation.pdf'
pdf_path = os.path.join('d:\\project_arka', pdf_name)

if not os.path.exists(pdf_path):
    print(f"File not found: {pdf_path}")
    sys.exit(1)

with open(pdf_path, 'rb') as f:
    reader = PyPDF2.PdfReader(f)
    with open('d:\\project_arka\\pdf_output.txt', 'w', encoding='utf-8') as out:
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                out.write(f"=== PAGE {i+1} ===\n")
                out.write(text)
                out.write("\n\n")
        print(f"Extracted {len(reader.pages)} pages to pdf_output.txt")
