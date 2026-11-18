enum FabricatorSyntaxStyle {
    static let colorRoles = [
        "plain": "foreground", "comment": "syntax-comment", "keyword": "syntax-keyword",
        "string": "syntax-string", "constant": "syntax-constant", "function": "syntax-function",
        "type": "syntax-type", "tag": "syntax-tag", "attribute": "syntax-constant",
        "property": "syntax-function", "variable": "syntax-tag", "regex": "syntax-type",
        "operator": "syntax-punctuation", "punctuation": "syntax-punctuation",
        "inserted": "success-text", "deleted": "destructive-text", "heading": "syntax-keyword", "link": "syntax-function"
    ]
    static func getColorRole(_ kind: String) -> String {
        guard let role = colorRoles[kind] else { preconditionFailure("Unknown canonical syntax token: \(kind)") }
        return role
    }
}
