# Native font assets

## Inter 4.1

The native renderers bundle the unmodified Inter variable fonts from the
[official Inter 4.1 release](https://github.com/rsms/inter/releases/tag/v4.1).
The web renderer uses Inter through Next's font loader. The upright font is
879,708 bytes and the italic font is 910,252 bytes before application packaging.

Keep `LICENSE.txt` with every redistributed copy. These assets are licensed
under the SIL Open Font License 1.1, separately from Fabricator UI's MIT code.

## Geist Mono

Code rendering uses the same family as the web font loader. These unmodified
upright and italic variable fonts come from [Google Fonts snapshot
121c8e30e20960139d24d1e93f350745205dd680](https://github.com/google/fonts/tree/121c8e30e20960139d24d1e93f350745205dd680/ofl/geistmono).
Keep `GeistMono-OFL.txt` with both fonts. They are optional native document/code
resources and are not installed as system fonts.

| File                         | Bytes   | SHA-256                                                          |
| ---------------------------- | ------- | ---------------------------------------------------------------- |
| GeistMonoVariable.ttf        | 171,948 | d00e590b8eb3a59acc329b2d044fd143ae935090b7da33199ebee27cc7de8196 |
| GeistMonoVariable-Italic.ttf | 182,656 | 70c15be47d55f637197f7e38570dbca16b35777ea647dc3598f61bf3961d2b0d |
