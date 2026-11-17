#if FABRICATOR_BLOCKS
import XCTest
@testable import FabricatorUI

final class BlockValidationTests: XCTestCase {
    func testLoginRequiresValidEmailAndNonemptyPasswordWithoutSignupLengthRule() {
        let invalid = validateFabricatorAuthValues(FabricatorAuthValues(email: "alex@", password: ""), template: "login-01")
        XCTAssertNotNil(invalid["email"])
        XCTAssertNotNil(invalid["password"])
        XCTAssertTrue(validateFabricatorAuthValues(FabricatorAuthValues(email: "alex@example.com", password: "a"), template: "login-01").isEmpty)
    }
    func testSignupRequiresMatchingConfirmationAndRequiredName() {
        let invalid = validateFabricatorAuthValues(FabricatorAuthValues(name: "", email: "alex@example.com", password: "long-password", confirmPassword: "different"), template: "signup-01")
        XCTAssertNotNil(invalid["name"])
        XCTAssertNotNil(invalid["confirmPassword"])
        let short = validateFabricatorAuthValues(FabricatorAuthValues(name: "Alex", email: "alex@example.com", password: "short", confirmPassword: "short"), template: "signup-03")
        XCTAssertNotNil(short["password"])
        XCTAssertTrue(validateFabricatorAuthValues(FabricatorAuthValues(name: "Alex", email: "alex@example.com", password: "long-password", confirmPassword: "long-password"), template: "signup-02").isEmpty)
    }
    func testEmailOnlyTemplatesRequireOnlyEmail() {
        let values = FabricatorAuthValues(email: "alex@example.com")
        XCTAssertTrue(validateFabricatorAuthValues(values, template: "login-05").isEmpty)
        XCTAssertTrue(validateFabricatorAuthValues(values, template: "signup-05").isEmpty)
        XCTAssertNotNil(validateFabricatorAuthValues(FabricatorAuthValues(email: "invalid"), template: "signup-05")["email"])
    }
    func testSignupFourDoesNotRequireNameButStillRequiresPasswordConfirmation() {
        let values = FabricatorAuthValues(email: "alex@example.com", password: "long-password", confirmPassword: "long-password")
        XCTAssertTrue(validateFabricatorAuthValues(values, template: "signup-04").isEmpty)
    }
}
#endif
