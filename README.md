# interface-de-base

Calculatrice macOS en SwiftUI, compilée et testée sur macOS via GitHub Actions.

## Structure

- `Sources/Calculator/` — application SwiftUI (fenêtre + boutons) et moteur de calcul (`CalculatorEngine`)
- `Tests/CalculatorTests/` — tests unitaires XCTest du moteur

## Utilisation en local (macOS)

```bash
swift build
swift run Calculator
```

## Tests

```bash
swift test
```

## CI

Le workflow `.github/workflows/macos.yml` compile le projet, exécute les tests et vérifie que l'application se lance sur un runner macOS (`macos-latest`) à chaque push, pull request ou déclenchement manuel.
