```markdown
# Random Fun Facts Script

## Overview

The Random Fun Facts script is a Python program that generates and displays a random fun fact whenever it is run. This script can be used as a simple entertainment tool or as a fun way to learn new and interesting facts.

## Features

- **Random Fun Facts**: The script contains a collection of fun facts, from which it randomly selects one to display each time the script is executed.

## Prerequisites

- Python 3.x

## Usage

To use the script, simply run it from the command line. You can optionally pass a textual input, although it is not used in the generation of the fun fact.

### Running the Script

```bash
python random_fun_fact.py <textual-input>
```

- `<textual-input>`: An optional argument. The script will acknowledge this input but will not use it to influence the fact displayed.

### Example

```bash
python random_fun_fact.py "Tell me something cool!"
```

**Output**:
```
You said: Tell me something cool!
Here's a random fun fact for you:
Octopuses have three hearts, nine brains, and blue blood.
```

## Help

To display help information, which provides details on how to use the script, you can include the `--help` flag:

```bash
python random_fun_fact.py --help
```

**Output**:
```
usage: random_fun_fact.py [-h] [input_text]

A simple script that provides a random fun fact.

positional arguments:
  input_text  Optional input text to be acknowledged.

optional arguments:
  -h, --help  show this help message and exit
```

## Code Overview

- **Imports**: The script uses the `random` module from the Python standard library to select a random fact.
- **Functions**:
  - `get_random_fun_fact()`: Returns a randomly selected fun fact from a predefined list.
  - `main(user_input: str)`: The main function that acknowledges the user input and prints a random fun fact.

### Example Fun Facts

Here are a few examples of fun facts included in the script:

1. "Honey never spoils. Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3000 years old!"
2. "Bananas are berries, but strawberries aren't."
3. "There are more stars in the universe than grains of sand on all the world's beaches."

## License

This script is released under the MIT License. You are free to use, modify, and distribute it as you wish.

## Acknowledgments

This fun fact generator was created as a simple and enjoyable project to demonstrate the use of random selection in Python. It's a light-hearted script meant to provide interesting tidbits of knowledge in an easy and accessible way.
```