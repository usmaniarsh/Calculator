"""
Advanced Calculator - Python Implementation
Connected to Flask web interface
"""

import math
import re

class AdvancedCalculator:
    def __init__(self):
        self.history = []
        self.last_result = None
        
    def factorial(self, n):
        """Calculate factorial of a number"""
        if n < 0:
            raise ValueError("Factorial of negative number is undefined")
        if not isinstance(n, (int, float)):
            raise ValueError("Factorial requires a number")
        if not n.is_integer():
            raise ValueError("Factorial requires integer")
        n = int(n)
        if n > 170:  # Prevent overflow
            raise ValueError("Number too large for factorial")
        return math.prod(range(1, n + 1))
    
    def normalize_expression(self, expr):
        """Normalize expression for Python evaluation"""
        # Replace visual operators
        expr = expr.replace('÷', '/')
        expr = expr.replace('×', '*')
        expr = expr.replace('−', '-')
        expr = expr.replace('π', str(math.pi))
        expr = expr.replace('^', '**')
        
        # Handle percentage
        expr = re.sub(r'(\d+\.?\d*)%', r'(\1/100)', expr)
        
        # Handle factorial - support parentheses
        expr = re.sub(r'(\d+\.?\d*|\))!', lambda m: 
                     f'self.factorial({m.group(1)})' if m.group(1) != ')' 
                     else 'self.factorial)', expr)
        
        # Handle trigonometric and math functions
        func_mappings = [
            ('sin', 'math.sin'),
            ('cos', 'math.cos'),
            ('tan', 'math.tan'),
            ('asin', 'math.asin'),
            ('acos', 'math.acos'),
            ('atan', 'math.atan'),
            ('log', 'math.log10'),
            ('ln', 'math.log'),
            ('sqrt', 'math.sqrt'),
            ('cbrt', 'lambda x: math.pow(x, 1/3)')
        ]
        
        for old, new in func_mappings:
            expr = expr.replace(old + '(', new + '(')
            
        return expr
    
    def evaluate(self, expression):
        """Evaluate a mathematical expression"""
        try:
            # Remove whitespace
            expression = expression.strip()
            
            if not expression:
                return None
            
            # Check for trailing operator
            if expression and expression[-1] in '+-*/÷×−^':
                raise ValueError("Incomplete expression (trailing operator)")
            
            # Check balanced parentheses
            if expression.count('(') != expression.count(')'):
                raise ValueError("Mismatched parentheses")
            
            # Normalize for Python
            normalized = self.normalize_expression(expression)
            
            # Create safe evaluation environment
            safe_dict = {
                'math': math,
                'self': self,
                '__builtins__': {
                    'abs': abs,
                    'round': round,
                    'max': max,
                    'min': min
                }
            }
            
            # Evaluate
            result = eval(normalized, safe_dict)
            
            # Format result
            if isinstance(result, float):
                if result.is_integer():
                    result = int(result)
                else:
                    # Round to avoid floating point issues
                    result = round(result, 12)
                    if abs(result - round(result, 8)) < 1e-10:
                        result = round(result, 8)
            
            # Save to history
            self.history.append({
                'expression': expression,
                'result': result,
                'normalized': normalized
            })
            self.last_result = result
            
            return result
            
        except ZeroDivisionError:
            raise ValueError("Division by zero")
        except OverflowError:
            raise ValueError("Result too large")
        except Exception as e:
            raise ValueError(f"Invalid expression: {str(e)}")
    
    def get_history(self):
        """Get calculation history"""
        return self.history
    
    def clear_history(self):
        """Clear calculation history"""
        self.history = []
        self.last_result = None
        
    def add_to_history(self, expression, result):
        """Manually add to history"""
        self.history.append({
            'expression': expression,
            'result': result
        })
        self.last_result = result


# Standalone test
if __name__ == "__main__":
    calc = AdvancedCalculator()
    
    print("=== Advanced Calculator Test ===\n")
    
    test_expressions = [
        "2+2",
        "5!",
        "sin(π/2)",
        "25% of 100",
        "2^10",
        "log(100)",
        "sqrt(144)",
        "cbrt(27)",
        "5! + 3^2",
        "sin(30) * 2"
    ]
    
    for expr in test_expressions:
        try:
            result = calc.evaluate(expr)
            print(f"{expr:15} = {result}")
        except Exception as e:
            print(f"{expr:15} → Error: {e}")
    
    print("\n=== Calculation History ===")
    for entry in calc.get_history():
        print(f"{entry['expression']:15} = {entry['result']}")
        
        