import XCTest
@testable import FabricatorUI

final class SankeyEngineTests: XCTestCase {
    private var nodes: [FabricatorSankeyNode] { ["direct", "partners", "platform", "support", "americas", "emea"].map { FabricatorSankeyNode(id: $0, title: $0.capitalized, column: 0) } }
    private var links: [FabricatorSankeyLink] { [
        .init(source: "direct", target: "platform", value: 60), .init(source: "direct", target: "support", value: 20), .init(source: "partners", target: "platform", value: 30), .init(source: "partners", target: "support", value: 10),
        .init(source: "platform", target: "americas", value: 50), .init(source: "platform", target: "emea", value: 40), .init(source: "support", target: "americas", value: 10), .init(source: "support", target: "emea", value: 20)
    ] }
    private func model(width: Double = 600, height: Double = 300, hidden: Set<String> = []) throws -> FabricatorSankeyLayout { try FabricatorSankeyEngine.layout(nodes: nodes, links: links, width: width, height: height, fontSize: 12, hidden: hidden) }
    private func node(_ id: String, in model: FabricatorSankeyLayout) throws -> FabricatorSankeyLayoutNode { try XCTUnwrap(model.nodes.first { $0.id == id }) }

    func testCanonicalWebGeometryAndProportions() throws {
        let current = try model()
        XCTAssertEqual(current.columns, 3)
        let direct = try node("direct", in: current), partners = try node("partners", in: current), platform = try node("platform", in: current), support = try node("support", in: current), emea = try node("emea", in: current)
        XCTAssertEqual(direct.column, 0); XCTAssertEqual(platform.column, 1); XCTAssertEqual(emea.column, 2)
        XCTAssertEqual(direct.x, 0); XCTAssertEqual(platform.x, 295); XCTAssertEqual(emea.x, 590)
        XCTAssertEqual(direct.height, 189.33333333333334, accuracy: 0.000001)
        XCTAssertEqual(partners.y, 205.33333333333331, accuracy: 0.000001)
        XCTAssertEqual(platform.height, 213, accuracy: 0.000001)
        XCTAssertEqual(support.y, 229, accuracy: 0.000001)
        XCTAssertEqual(emea.y, 158, accuracy: 0.000001)
        XCTAssertEqual(direct.height / partners.height, 2, accuracy: 0.000001)
        XCTAssertEqual(platform.valueIn, 90); XCTAssertEqual(platform.valueOut, 90)
        XCTAssertEqual(try XCTUnwrap(current.links.first { $0.id == "direct→platform" }).share, 0.75)
    }

    func testEveryRibbonConservesFlowAndFitsInsideItsNodes() throws {
        let current = try model()
        for item in current.nodes {
            let outgoing = current.links.filter { $0.source == item.id }, incoming = current.links.filter { $0.target == item.id }
            XCTAssertEqual(outgoing.reduce(0) { $0 + $1.value }, item.valueOut)
            XCTAssertEqual(incoming.reduce(0) { $0 + $1.value }, item.valueIn)
            XCTAssertEqual(outgoing.reduce(0) { $0 + $1.sourceBottom - $1.sourceTop }, item.height * item.valueOut / item.value, accuracy: 0.000001)
            XCTAssertEqual(incoming.reduce(0) { $0 + $1.targetBottom - $1.targetTop }, item.height * item.valueIn / item.value, accuracy: 0.000001)
            for link in outgoing { XCTAssertGreaterThanOrEqual(link.sourceTop, item.y - 0.000001); XCTAssertLessThanOrEqual(link.sourceBottom, item.y + item.height + 0.000001); XCTAssertEqual(link.sourceBottom - link.sourceTop, link.targetBottom - link.targetTop, accuracy: 0.000001); XCTAssertEqual(link.color, item.color) }
        }
    }

    func testLongestPathAndEarlySinksUseComputedColumns() throws {
        let values = ["a", "b", "c", "d", "early"].map { FabricatorSankeyNode(id: $0, title: $0, column: 99) }
        let flows: [FabricatorSankeyLink] = [.init(source: "a", target: "b", value: 5), .init(source: "b", target: "c", value: 5), .init(source: "a", target: "c", value: 2), .init(source: "c", target: "d", value: 7), .init(source: "a", target: "early", value: 1)]
        let current = try FabricatorSankeyEngine.layout(nodes: values, links: flows, width: 600, height: 300)
        XCTAssertEqual(try node("c", in: current).column, 2); XCTAssertEqual(try node("d", in: current).column, 3); XCTAssertEqual(try node("early", in: current).column, 3)
    }

    func testUnequalTotalsUseLargerValueAndCenterTheSmallerStack() throws {
        let values = ["a", "b", "c"].map { FabricatorSankeyNode(id: $0, title: $0, column: 0) }
        let current = try FabricatorSankeyEngine.layout(nodes: values, links: [.init(source: "a", target: "b", value: 10), .init(source: "b", target: "c", value: 5)], width: 300, height: 200)
        let middle = try node("b", in: current), leaving = try XCTUnwrap(current.links.first { $0.source == "b" })
        XCTAssertEqual(middle.value, 10); XCTAssertEqual(middle.valueIn, 10); XCTAssertEqual(middle.valueOut, 5)
        XCTAssertEqual(leaving.sourceTop - middle.y, middle.height / 4, accuracy: 0.000001)
        XCTAssertEqual(leaving.sourceBottom - leaving.sourceTop, middle.height / 2, accuracy: 0.000001)
    }

    func testInvalidValuesAndDisconnectedNodesAreNotDrawn() throws {
        let values = nodes + [.init(id: "unused", title: "Unused", column: 0)]
        let invalid: [FabricatorSankeyLink] = [0, -1, .nan, .infinity].map { .init(source: "direct", target: "emea", value: $0) }
        let current = try FabricatorSankeyEngine.layout(nodes: values, links: links + invalid, width: 600, height: 300)
        XCTAssertEqual(current.links.count, links.count); XCTAssertFalse(current.nodes.contains { $0.id == "unused" }); XCTAssertEqual(current.series.count, values.count)
        let empty = try FabricatorSankeyEngine.layout(nodes: nodes, links: invalid, width: 600, height: 300)
        XCTAssertTrue(empty.nodes.isEmpty); XCTAssertTrue(empty.links.isEmpty)
        for bounds in [(0.0, 200.0), (-1.0, 200.0), (Double.nan, 200.0), (200.0, Double.infinity)] { XCTAssertTrue(try FabricatorSankeyEngine.layout(nodes: nodes, links: links, width: bounds.0, height: bounds.1).links.isEmpty) }
    }

    func testGraphErrorsAreTypedAndDoNotSilentlyDropData() {
        XCTAssertThrowsError(try FabricatorSankeyEngine.layout(nodes: nodes + [nodes[0]], links: links, width: 600, height: 300)) { XCTAssertEqual($0 as? FabricatorSankeyLayoutError, .duplicateNode("direct")) }
        XCTAssertThrowsError(try FabricatorSankeyEngine.layout(nodes: nodes, links: [.init(source: "direct", target: "missing", value: 0)], width: 600, height: 300)) { XCTAssertEqual($0 as? FabricatorSankeyLayoutError, .unknownNode("missing")) }
        XCTAssertThrowsError(try FabricatorSankeyEngine.layout(nodes: nodes, links: links + [.init(source: "emea", target: "direct", value: 1)], width: 600, height: 300)) { guard case .cycle(let path)? = $0 as? FabricatorSankeyLayoutError else { return XCTFail("Expected typed cycle") }; XCTAssertEqual(path.first, path.last); XCTAssertTrue(path.contains("emea")) }
    }

    func testCrowdedNodesStayInsideBoundsAndDoNotOverlap() throws {
        let values = [FabricatorSankeyNode(id: "source", title: "Source", column: 0)] + (0..<12).map { .init(id: "t\($0)", title: "Target \($0)", column: 0) }
        let flows = (0..<12).map { FabricatorSankeyLink(source: "source", target: "t\($0)", value: Double($0 + 1)) }
        let current = try FabricatorSankeyEngine.layout(nodes: values, links: flows, width: 200, height: 40)
        for column in 0..<current.columns { let stack = current.nodes.filter { $0.column == column }.sorted { $0.y < $1.y }; for (index, item) in stack.enumerated() { XCTAssertGreaterThanOrEqual(item.y, -0.000001); XCTAssertLessThanOrEqual(item.y + item.height, 40.000001); if index > 0 { XCTAssertGreaterThan(item.y, stack[index - 1].y + stack[index - 1].height) } } }
    }

    func testPaletteSlotsStayInDataOrderAndLinksUseSourceColor() throws {
        var values = nodes; values[3].color = "var(--success)"
        let current = try FabricatorSankeyEngine.layout(nodes: values, links: links, width: 600, height: 300, hidden: ["partners"])
        XCTAssertEqual(try node("platform", in: current).color, "chart-series-3"); XCTAssertEqual(try node("support", in: current).color, "success")
        XCTAssertEqual(current.links.first { $0.source == "support" }?.color, "success")
        XCTAssertFalse(current.links.contains { $0.source == "partners" || $0.target == "partners" })
    }

    func testParallelLinksGetUniqueIDsWithoutLosingTheirWeights() throws {
        let current = try FabricatorSankeyEngine.layout(nodes: nodes, links: links + [.init(source: "direct", target: "platform", value: 5)], width: 600, height: 300)
        XCTAssertEqual(Set(current.links.map(\.id)).count, links.count + 1)
        XCTAssertEqual(current.links.filter { $0.source == "direct" && $0.target == "platform" }.reduce(0) { $0 + $1.value }, 65)
    }

    func testHitTestingFindsNodesAndRibbonsInReadingOrder() throws {
        let current = try model(), direct = try node("direct", in: model())
        let nodeIndex = FabricatorSankeyEngine.markAt(x: direct.x + direct.width + 5, y: direct.y + direct.height / 2, in: current)
        XCTAssertEqual(nodeIndex, current.links.count)
        let link = try XCTUnwrap(current.links.first)
        XCTAssertEqual(FabricatorSankeyEngine.markAt(x: (link.x0 + link.x1) / 2, y: (link.sourceTop + link.sourceBottom + link.targetTop + link.targetBottom) / 4, in: current), 0)
        XCTAssertNil(FabricatorSankeyEngine.markAt(x: -50, y: -50, in: current))
        let platformIndex = try XCTUnwrap(current.nodes.firstIndex { $0.id == "platform" })
        let highlight = try XCTUnwrap(FabricatorSankeyEngine.highlight(index: current.links.count + platformIndex, in: current))
        XCTAssertEqual(highlight.nodes, ["direct", "partners", "platform", "americas", "emea"])
        XCTAssertEqual(highlight.links.count, 4)
    }

    func testLabelsDropWhenTheyDoNotFitAndSinksFaceInward() throws {
        let current = try model()
        XCTAssertEqual(try node("direct", in: current).labelLines, 2)
        XCTAssertFalse(try node("direct", in: current).isLabelBefore)
        XCTAssertTrue(try node("emea", in: current).isLabelBefore)
        XCTAssertEqual(try node("direct", in: model(width: 140)).labelLines, 0)
    }
}
