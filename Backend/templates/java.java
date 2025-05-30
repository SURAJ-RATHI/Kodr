// Java Boilerplate
// Author: Your Name
// Date: ${new Date().toLocaleDateString()}

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
        
        // Example method call
        String result = exampleMethod();
        System.out.println(result);
        
        // Example class usage
        ExampleClass example = new ExampleClass();
        System.out.println(example.increment());
    }
    
    // Example method
    public static String exampleMethod() {
        return "This is an example method";
    }
}

// Example class
class ExampleClass {
    private int value;
    
    public ExampleClass() {
        this.value = 0;
    }
    
    public int increment() {
        value++;
        return value;
    }
} 