import PyPDF2

with open(r'd:\project_arka\gnatt chart arka generation.pdf', 'rb') as f:
    reader = PyPDF2.PdfReader(f)
    with open(r'd:\project_arka\pdf_output.txt', 'w', encoding='utf-8') as out:
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                out.write(f"=== PAGE {i+1} ===\n")
                out.write(text)
                out.write("\n\n")
        print(f"Extracted {len(reader.pages)} pages to pdf_output.txt")
