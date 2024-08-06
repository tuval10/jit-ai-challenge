import random

def get_random_fun_fact():
    fun_facts = [
        "Honey never spoils. Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3000 years old!",
        "Octopuses have three hearts, nine brains, and blue blood.",
        "Bananas are berries, but strawberries aren't.",
        "There are more stars in the universe than grains of sand on all the world's beaches.",
        "A group of flamingos is called a 'flamboyance.'"
    ]
    return random.choice(fun_facts)

def main(user_input: str):
    print(f"You said: {user_input}")
    print("Here's a random fun fact for you:")
    print(get_random_fun_fact())

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        main(" ".join(sys.argv[1:]))
    else:
        print("Please provide an input argument.")