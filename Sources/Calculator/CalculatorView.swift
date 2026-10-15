import SwiftUI

struct CalculatorView: View {
    @State private var engine = CalculatorEngine()

    private let buttons: [[CalculatorButton]] = [
        [.clear, .operation(.divide), .operation(.multiply), .operation(.subtract)],
        [.digit("7"), .digit("8"), .digit("9"), .operation(.add)],
        [.digit("4"), .digit("5"), .digit("6"), .equals],
        [.digit("1"), .digit("2"), .digit("3"), .digit("0")],
        [.dot, .digit("00")]
    ]

    var body: some View {
        VStack(spacing: 12) {
            Text(engine.display)
                .font(.system(size: 44, weight: .light, design: .rounded))
                .frame(maxWidth: .infinity, alignment: .trailing)
                .lineLimit(1)
                .minimumScaleFactor(0.4)
                .padding(.horizontal, 4)

            ForEach(buttons.indices, id: \.self) { row in
                HStack(spacing: 10) {
                    ForEach(buttons[row].indices, id: \.self) { col in
                        buttonView(buttons[row][col])
                    }
                }
            }
        }
        .padding(16)
        .background(.black)
    }

    private func buttonView(_ button: CalculatorButton) -> some View {
        Button {
            handle(button)
        } label: {
            Text(button.title)
                .font(.system(size: 20, weight: .medium, design: .rounded))
                .frame(maxWidth: .infinity, minHeight: 54)
                .background(backgroundColor(for: button))
                .foregroundStyle(Color.white)
                .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
    }

    private func backgroundColor(for button: CalculatorButton) -> Color {
        switch button {
        case .digit, .dot:
            return Color(white: 0.25)
        case .operation, .equals:
            return .orange
        case .clear:
            return Color(white: 0.45)
        }
    }

    private func handle(_ button: CalculatorButton) {
        switch button {
        case .digit(let d):
            engine.inputDigit(d)
        case .dot:
            engine.inputDigit(".")
        case .operation(let op):
            engine.setOperation(op)
        case .equals:
            engine.equals()
        case .clear:
            engine.clear()
        }
    }
}

enum CalculatorButton {
    case digit(String)
    case dot
    case operation(CalculatorOperation)
    case equals
    case clear

    var title: String {
        switch self {
        case .digit(let d): return d
        case .dot: return ","
        case .operation(let op): return op.rawValue
        case .equals: return "="
        case .clear: return "AC"
        }
    }
}
