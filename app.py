from flask import Flask, render_template, request, jsonify, session
from calculator import AdvancedCalculator
import traceback

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'  # Required for sessions
calc = AdvancedCalculator()

@app.route('/')
def index():
    """Render the main calculator page"""
    # Get theme from session or default to light
    theme = session.get('theme', 'light')
    return render_template('index.html', theme=theme)

@app.route('/set-theme', methods=['POST'])
def set_theme():
    """Save theme preference in session"""
    try:
        data = request.get_json()
        theme = data.get('theme', 'light')
        session['theme'] = theme
        return jsonify({'success': True, 'theme': theme})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/calculate', methods=['POST'])
def calculate():
    """API endpoint for calculations"""
    try:
        data = request.get_json()
        expression = data.get('expression', '')
        
        if not expression:
            return jsonify({'error': 'No expression provided'}), 400
        
        result = calc.evaluate(expression)
        
        return jsonify({
            'success': True,
            'expression': expression,
            'result': result,
            'history': calc.get_history()[-5:]
        })
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Calculation error: {str(e)}'}), 500

@app.route('/history', methods=['GET'])
def get_history():
    """Get calculation history"""
    return jsonify({
        'history': calc.get_history(),
        'last_result': calc.last_result
    })

@app.route('/clear-history', methods=['POST'])
def clear_history():
    """Clear calculation history"""
    calc.clear_history()
    return jsonify({'success': True, 'message': 'History cleared'})

if __name__ == '__main__':
    app.run(debug=True, port=5000)