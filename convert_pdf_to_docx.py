# convert_pdf_to_docx.py
import sys
from pdf2docx import Converter
import os

def convert(pdf_file, docx_file):
    cv = Converter(pdf_file)
    cv.convert(docx_file, start=0, end=None)
    cv.close()

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python convert_pdf_to_docx.py input.pdf output.docx")
        sys.exit(1)

    input_pdf = sys.argv[1]
    output_docx = sys.argv[2]

    if not os.path.exists(input_pdf):
        print("❌ Input PDF does not exist:", input_pdf)
        sys.exit(1)

    convert(input_pdf, output_docx)
