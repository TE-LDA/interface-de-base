import XCTest
@testable import Calculator

final class CalculatorEngineTests: XCTestCase {
    private func makeEngine() -> CalculatorEngine {
        CalculatorEngine()
    }

    func testDigitsInput() {
        var engine = makeEngine()
        engine.inputDigit("1")
        engine.inputDigit("2")
        engine.inputDigit("3")
        XCTAssertEqual(engine.display, "123")
    }

    func testAddition() {
        var engine = makeEngine()
        engine.inputDigit("2")
        engine.setOperation(.add)
        engine.inputDigit("3")
        engine.equals()
        XCTAssertEqual(engine.display, "5")
    }

    func testMultiplication() {
        var engine = makeEngine()
        engine.inputDigit("4")
        engine.setOperation(.multiply)
        engine.inputDigit("5")
        engine.equals()
        XCTAssertEqual(engine.display, "20")
    }

    func testDivision() {
        var engine = makeEngine()
        engine.inputDigit("9")
        engine.setOperation(.divide)
        engine.inputDigit("2")
        engine.equals()
        XCTAssertEqual(engine.display, "4.5")
    }

    func testDivisionByZero() {
        var engine = makeEngine()
        engine.inputDigit("5")
        engine.setOperation(.divide)
        engine.inputDigit("0")
        engine.equals()
        XCTAssertEqual(engine.display, "Erreur")
    }

    func testChainedOperations() {
        var engine = makeEngine()
        engine.inputDigit("2")
        engine.setOperation(.add)
        engine.inputDigit("3")
        engine.setOperation(.multiply)
        engine.inputDigit("4")
        engine.equals()
        XCTAssertEqual(engine.display, "20")
    }

    func testClear() {
        var engine = makeEngine()
        engine.inputDigit("7")
        engine.setOperation(.add)
        engine.clear()
        XCTAssertEqual(engine.display, "0")
    }

    func testDecimalInput() {
        var engine = makeEngine()
        engine.inputDigit("3")
        engine.inputDigit(".")
        engine.inputDigit("1")
        engine.inputDigit("4")
        XCTAssertEqual(engine.display, "3.14")
    }

    func testDoubleDotIgnored() {
        var engine = makeEngine()
        engine.inputDigit("1")
        engine.inputDigit(".")
        engine.inputDigit(".")
        engine.inputDigit("5")
        XCTAssertEqual(engine.display, "1.5")
    }
}
