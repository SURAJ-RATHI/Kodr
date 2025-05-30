#!/usr/bin/env python3
# Python Boilerplate
# Author: Your Name
# Date: ${new Date().toLocaleDateString()}

def example_function():
    """Example function that returns a string."""
    return "This is an example function"

class ExampleClass:
    """Example class with basic functionality."""
    
    def __init__(self):
        self.value = 0
    
    def increment(self):
        """Increment the value and return it."""
        self.value += 1
        return self.value

def main():
    print("Hello, World!")
    
    # Call example function
    result = example_function()
    print(result)
    
    # Use example class
    example = ExampleClass()
    print(example.increment())

if __name__ == "__main__":
    main() 