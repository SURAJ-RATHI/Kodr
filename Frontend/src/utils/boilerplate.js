export const getBoilerplateCode = (language) => {
  const boilerplates = {
    javascript: `// JavaScript Boilerplate
function main() {
    console.log("Hello, World!");
}

// Call the main function
main();`,

    python: `# Python Boilerplate
def main():
    print("Hello, World!")

if __name__ == "__main__":
    main()`,

    java: `// Java Boilerplate
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`,

    cpp: `// C++ Boilerplate
#include <iostream>

int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}`
  };

  return boilerplates[language] || boilerplates.javascript;
}; 