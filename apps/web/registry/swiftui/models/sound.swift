import Foundation

public struct FabricatorSoundPartial: Codable, Sendable {
    public var wave: String
    public var freq: Double
    public var to: Double?
    public var at: Double?
    public var length: Double
    public var attack: Double?
    public var gain: Double
    public var lowpass: Double?
    public var q: Double?
}
public struct FabricatorSoundDefinition: Decodable, Identifiable, Sendable {
    public var name: String
    public var category: String
    public var description: String
    public var usedBy: String
    public var partials: [FabricatorSoundPartial]
    public var id: String { name }
}
public enum FabricatorSoundSynthesizer {
    private struct Filter { var b0: Double; var b1: Double; var b2: Double; var a1: Double; var a2: Double }
    private static func makeFilter(frequency: Double, q: Double, rate: Double, bandpass: Bool) -> Filter {
        let omega = 2 * Double.pi * min(frequency, rate * 0.49) / rate
        let alpha = sin(omega) / (2 * q), cosine = cos(omega), a0 = 1 + alpha
        return Filter(b0: (bandpass ? alpha : (1 - cosine) / 2) / a0, b1: bandpass ? 0 : (1 - cosine) / a0, b2: (bandpass ? -alpha : (1 - cosine) / 2) / a0, a1: -2 * cosine / a0, a2: (1 - alpha) / a0)
    }
    public static func render(_ partials: [FabricatorSoundPartial], sampleRate: Int = 44100, pitch: Double = 1, masterLevel: Double = 0.45) -> [Float] {
        let end = partials.reduce(0) { max($0, ($1.at ?? 0) + $1.length) }
        var samples = Array(repeating: Float.zero, count: Int(ceil(end / 1000 * Double(sampleRate))))
        for (index, partial) in partials.enumerated() {
            let start = Int(floor((partial.at ?? 0) / 1000 * Double(sampleRate))), length = partial.length / 1000
            let count = min(Int(ceil(length * Double(sampleRate))), samples.count - start)
            let attack = min((partial.attack ?? 2) / 1000, length * 0.5), from = partial.freq * pitch, to = (partial.to ?? partial.freq) * pitch
            let isNoise = partial.wave == "noise"
            var noise = UInt32(22222 + index), phase = 0.0, x1 = 0.0, x2 = 0.0, y1 = 0.0, y2 = 0.0
            var filter = makeFilter(frequency: isNoise ? from : partial.lowpass ?? 8000, q: isNoise ? partial.q ?? 1 : pow(10, 1.0 / 20), rate: Double(sampleRate), bandpass: isNoise)
            guard count > 0 else { continue }
            for offset in 0..<count {
                let time = Double(offset) / Double(sampleRate), frequency = from * pow(to / from, time / length)
                if isNoise && from != to { filter = makeFilter(frequency: frequency, q: partial.q ?? 1, rate: Double(sampleRate), bandpass: true) }
                let input: Double
                if isNoise { noise = noise &* 1664525 &+ 1013904223; input = Double(noise) / Double(UInt32.max) * 2 - 1 }
                else { switch partial.wave { case "sine": input = sin(2 * .pi * phase); case "square": input = phase < 0.5 ? 1 : -1; case "sawtooth": input = 2 * phase - 1; default: input = phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase } }
                phase = (phase + frequency / Double(sampleRate)).truncatingRemainder(dividingBy: 1)
                let output = filter.b0 * input + filter.b1 * x1 + filter.b2 * x2 - filter.a1 * y1 - filter.a2 * y2
                x2 = x1; x1 = input; y2 = y1; y1 = output
                let envelope = time < attack ? 0.0001 * pow(partial.gain / 0.0001, time / attack) : partial.gain * pow(0.0001 / partial.gain, (time - attack) / max(length - attack, 0.000001))
                samples[start + offset] += Float(output * envelope)
            }
        }
        return samples.map { max(-1, min(1, $0 * Float(masterLevel))) }
    }
    public static func encodeWav(_ samples: [Float], sampleRate: Int = 44100) -> Data {
        var data = Data()
        func appendString(_ string: String) { data.append(contentsOf: string.utf8) }
        func append16(_ value: UInt16) { withUnsafeBytes(of: value.littleEndian) { data.append(contentsOf: $0) } }
        func append32(_ value: UInt32) { withUnsafeBytes(of: value.littleEndian) { data.append(contentsOf: $0) } }
        appendString("RIFF"); append32(UInt32(36 + samples.count * 2)); appendString("WAVEfmt "); append32(16); append16(1); append16(1); append32(UInt32(sampleRate)); append32(UInt32(sampleRate * 2)); append16(2); append16(16); appendString("data"); append32(UInt32(samples.count * 2))
        for sample in samples { let bounded = max(-1, min(1, sample)); let value = Int16(bounded < 0 ? bounded * 32768 : bounded * 32767); append16(UInt16(bitPattern: value)) }
        return data
    }
}
