pub const MAX_NOTE_BYTES: usize = 65_536;

pub fn validate_note(text: &str) -> Result<(), &'static str> {
    if text.len() > MAX_NOTE_BYTES {
        return Err("The note must be at most 65,536 UTF-8 bytes.");
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_empty_and_bounded_notes() {
        assert!(validate_note("").is_ok());
        assert!(validate_note(&"a".repeat(MAX_NOTE_BYTES)).is_ok());
    }

    #[test]
    fn limits_encoded_bytes_rather_than_characters() {
        assert!(validate_note(&"é".repeat(MAX_NOTE_BYTES / 2)).is_ok());
        assert!(validate_note(&"é".repeat(MAX_NOTE_BYTES / 2 + 1)).is_err());
    }
}
