import argparse

def add(x, y):
    """Returns the sum of x and y."""
    return x + y

def subtract(x, y):
    """Returns the difference when y is subtracted from x."""
    return x - y

def multiply(x, y):
    """Returns the product of x and y."""
    return x * y

def divide(x, y):
    """Returns the quotient of x divided by y. Raises an error if y is zero."""
    if y == 0:
        raise ValueError("Cannot divide by zero!")
    return x / y

def main():
    # Set up the argument parser
    parser = argparse.ArgumentParser(
        description="A simple calculator that performs basic arithmetic operations."
    )
    parser.add_argument(
        "operation",
        choices=["add", "subtract", "multiply", "divide"],
        help="The operation to perform. Choose from 'add', 'subtract', 'multiply', 'divide'."
    )
    parser.add_argument(
        "x",
        type=float,
        help="The first number."
    )
    parser.add_argument(
        "y",
        type=float,
        help="The second number."
    )
    
    # Parse the command line arguments
    args = parser.parse_args()
    
    # Perform the selected operation
    if args.operation == "add":
        result = add(args.x, args.y)
    elif args.operation == "subtract":
        result = subtract(args.x, args.y)
    elif args.operation == "multiply":
        result = multiply(args.x, args.y)
    elif args.operation == "divide":
        try:
            result = divide(args.x, args.y)
        except ValueError as e:
            print(e)
            return

    # Display the result
    print(f"The result of {args.operation}ing {args.x} and {args.y} is: {result}")

if __name__ == "__main__":
    main()