#!/usr/bin/env python3
import sys

def count_words(text):
    return len(text.split())

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python test-script.py '<input_text>'")
        sys.exit(1)

    input_text = sys.argv[1]
    word_count = count_words(input_text)
    print(f"Word Count: {word_count}")