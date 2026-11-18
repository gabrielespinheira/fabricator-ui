import SwiftUI
import FabricatorUI

private enum DataTableDemoData {
    private struct Examples: Decodable {
        struct Account: Decodable {
            var id: String; var company: String; var stage: String; var owner: String
            var segments: [String]; var value: Double; var probability: Double; var health: Double
            var seats: Int; var lastContact: String; var website: String; var contact: String; var active: Bool
            var row: FabricatorTableRow {
                FabricatorTableRow(id: id, cells: ["company": company, "stage": stage, "owner": owner, "segments": segments.joined(separator: ","), "value": String(value), "probability": String(probability), "health": String(health), "seats": String(seats), "lastContact": lastContact, "website": website, "contact": contact, "active": String(active)])
            }
        }
        struct Column: Decodable {
            struct Metadata: Decodable {
                struct Option: Decodable { var value: String; var label: String; var tone: String?; var image: URL? }
                struct Format: Decodable { var fractionDigits: Int?; var relative: Bool? }
                var type: String; var label: String; var primary: Bool?; var pin: String?
                var aggregate: String?; var editable: Bool?; var options: [Option]?; var format: Format?
            }
            var id: String; var size: Double?; var meta: Metadata
            var column: FabricatorTableColumn {
                guard let type = FabricatorTableColumnType(rawValue: meta.type) else { preconditionFailure("Unknown canonical table type: \(meta.type)") }
                let options = meta.options ?? []
                let variants = ["neutral": "secondary", "destructive": "destructive", "info": "info", "warning": "warning", "success": "success"]
                return FabricatorTableColumn(id, title: meta.label, type: type, options: options.map(\.value), optionColors: Dictionary(uniqueKeysWithValues: options.map { ($0.value, variants[$0.tone ?? "neutral", default: "secondary"]) }), isEditable: meta.editable ?? false, isPrimary: meta.primary ?? false, optionLabels: Dictionary(uniqueKeysWithValues: options.map { ($0.value, $0.label) }), optionImageURLs: Dictionary(uniqueKeysWithValues: options.compactMap { option in option.image.map { (option.value, $0) } }), fractionDigits: meta.format?.fractionDigits, isDateRelative: meta.format?.relative ?? false)
            }
        }
        var rows: [Account]; var columns: [Column]; var now: Double
    }
    private static let examples: Examples = {
        guard let url = Bundle.main.url(forResource: "data-table-examples", withExtension: "json") else { preconditionFailure("Run the SwiftUI launcher to sync React's account fixture.") }
        do { return try JSONDecoder().decode(Examples.self, from: Data(contentsOf: url)) }
        catch { preconditionFailure("Invalid account fixture: \(error)") }
    }()
    static let columns = examples.columns.map(\.column)
    static let rows = examples.rows.map(\.row)
    static let referenceDate = Date(timeIntervalSince1970: examples.now / 1000)
    static var state: FabricatorTableState {
        var state = FabricatorTableState(sortKey: "value", ascending: false)
        state.leadingPinnedColumns = examples.columns.filter { $0.meta.pin == "start" }.map(\.id)
        state.columnWidths = Dictionary(uniqueKeysWithValues: examples.columns.compactMap { column in column.size.map { (column.id, $0) } })
        state.aggregates = Dictionary(uniqueKeysWithValues: examples.columns.compactMap { column in
            guard let name = column.meta.aggregate else { return nil }
            guard let aggregate = FabricatorTableAggregate(rawValue: name) else { preconditionFailure("Unknown canonical aggregate: \(name)") }
            return (column.id, aggregate)
        })
        return state
    }
}

struct DataTableDemo: View {
    @State private var rows = DataTableDemoData.rows
    @State private var state = DataTableDemoData.state
    @State private var selection = Set<String>()
    var body: some View {
        FabricatorDataTable(columns: DataTableDemoData.columns, rows: $rows, state: $state, selectedRows: $selection, searchPlaceholder: "Search accounts…", referenceDate: DataTableDemoData.referenceDate)
            .accessibilityIdentifier("fabricator-account-table")
    }
}
