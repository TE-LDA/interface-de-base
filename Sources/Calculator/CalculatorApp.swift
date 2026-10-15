import SwiftUI

@main
struct CalculatorApp: App {
    var body: some Scene {
        WindowGroup {
            CalculatorView()
                .frame(minWidth: 260, minHeight: 360)
        }
        .windowResizability(.contentSize)
    }
}
