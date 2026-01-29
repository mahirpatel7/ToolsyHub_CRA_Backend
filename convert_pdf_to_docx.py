# # convert_pdf_to_docx.py
# import sys
# from pdf2docx import Converter
# import os

# def convert(pdf_file, docx_file):
#     cv = Converter(pdf_file)
#     cv.convert(docx_file, start=0, end=None)
#     cv.close()

# if __name__ == "__main__":
#     if len(sys.argv) != 3:
#         print("Usage: python convert_pdf_to_docx.py input.pdf output.docx")
#         sys.exit(1)

#     input_pdf = sys.argv[1]
#     output_docx = sys.argv[2]

#     if not os.path.exists(input_pdf):
#         print("❌ Input PDF does not exist:", input_pdf)
#         sys.exit(1)

#     convert(input_pdf, output_docx)




# convert_pdf_to_docx.py
import sys
import os
from pdf2docx import convert

def convert_pdf_to_word(pdf_path, docx_path):
    """Convert PDF to DOCX using pdf2docx"""
    try:
        print(f"📄 Converting {pdf_path} to {docx_path}")
        
        # Use pdf2docx to convert
        convert(
            pdf_path,
            docx_path,
            start=0,
            end=None,
            pages=None
        )
        
        # Verify the output file was created
        if os.path.exists(docx_path) and os.path.getsize(docx_path) > 0:
            print(f"✅ Successfully converted to: {docx_path}")
            return True
        else:
            print("❌ DOCX file was not created properly")
            return False
            
    except ImportError as e:
        print(f"❌ Import Error: {str(e)}")
        print("Make sure pdf2docx is installed: pip install pdf2docx")
        return False
    except Exception as e:
        print(f"❌ Conversion Error: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python convert_pdf_to_docx.py input.pdf output.docx")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    # Check if input file exists
    if not os.path.exists(input_file):
        print(f"❌ Input PDF does not exist: {input_file}")
        sys.exit(1)
    
    # Convert
    if convert_pdf_to_word(input_file, output_file):
        print(f"✅ Conversion successful!")
        sys.exit(0)
    else:
        print("❌ Conversion failed")
        sys.exit(1)