import Foundation

enum CalculatorOperation: String {
    case add = "+"
    case subtract = "−"
    case multiply = "×"
    case divide = "÷"
}

struct CalculatorEngine {
    private(set) var display: String = "0"
    private var accumulator: Double?
    private var pendingOperation: CalculatorOperation?
    private var freshInput = true

    mutating func inputDigit(_ digit: String) {
        if freshInput {
            display = digit == "." ? "0." : digit
            freshInput = false
        } else {
            if digit == "." && display.contains(".") { return }
            if display == "0" && digit != "." {
                display = digit
            } else {
                display += digit
            }
        }
    }

    mutating func setOperation(_ op: CalculatorOperation) {
        let value = Double(display.replacingOccurrences(of: ",", with: ".")) ?? 0
        if let acc = accumulator, let pending = pendingOperation, !freshInput {
            if let result = evaluate(acc, pending, value) {
                accumulator = result
                display = format(result)
            } else {
                display = "Erreur"
                accumulator = nil
                pendingOperation = nil
                freshInput = true
                return
            }
        } else {
            accumulator = value
        }
        pendingOperation = op
        freshInput = true
    }

    mutating func equals() {
        guard let acc = accumulator, let pending = pendingOperation else { return }
        let value = Double(display.replacingOccurrences(of: ",", with: ".")) ?? 0
        if let result = evaluate(acc, pending, value) {
            display = format(result)
            accumulator = result
        } else {
            display = "Erreur"
            accumulator = nil
        }
        pendingOperation = nil
        freshInput = true
    }

    mutating func clear() {
        display = "0"
        accumulator = nil
        pendingOperation = nil
        freshInput = true
    }

    private func evaluate(_ a: Double, _ op: CalculatorOperation, _ b: Double) -> Double? {
        switch op {
        case .add: return a + b
        case .subtract: return a - b
        case .multiply: return a * b
        case .divide: return b == 0 ? nil : a / b
        }
    }

    private func format(_ value: Double) -> String {
        if value.truncatingRemainder(dividingBy: 1) == 0 && abs(value) < 1e15 {
            return String(Int64(value))
        }
        return String(format: "%.10g", value)
    }
}
