using ScriptConverter;
using ScriptConverter.Mappings;

if (args.Length < 2)
{
    PrintUsage();
    return 1;
}

var direction = args[0].ToLowerInvariant();
var input = string.Join(' ', args.Skip(1));

var transliterator = ScriptTransliterator.Instance;

try
{
    var (from, to) = ParseDirection(direction);
    var result = transliterator.Convert(input, from, to);
    Console.WriteLine(result);
    return 0;
}
catch (ArgumentException ex)
{
    Console.Error.WriteLine($"Error: {ex.Message}");
    PrintUsage();
    return 1;
}

static (Script from, Script to) ParseDirection(string direction) => direction switch
{
    "r2u" or "roman-to-urdu" => (Script.Roman, Script.UrduArabic),
    "u2r" or "urdu-to-roman" => (Script.UrduArabic, Script.Roman),
    "r2h" or "roman-to-hindi" => (Script.Roman, Script.HindiDevanagari),
    "h2r" or "hindi-to-roman" => (Script.HindiDevanagari, Script.Roman),
    "u2h" or "urdu-to-hindi" => (Script.UrduArabic, Script.HindiDevanagari),
    "h2u" or "hindi-to-urdu" => (Script.HindiDevanagari, Script.UrduArabic),
    _ => throw new ArgumentException($"Unknown conversion direction: '{direction}'")
};

static void PrintUsage()
{
    Console.Error.WriteLine("""
    ScriptConverter CLI - Transliterate between Urdu, Hindi, and Roman scripts

    Usage:
      scriptconverter <direction> <text>

    Directions:
      r2u, roman-to-urdu      Roman → Urdu Arabic script
      u2r, urdu-to-roman      Urdu Arabic script → Roman
      r2h, roman-to-hindi     Roman → Hindi Devanagari
      h2r, hindi-to-roman     Hindi Devanagari → Roman
      u2h, urdu-to-hindi      Urdu Arabic → Hindi Devanagari
      h2u, hindi-to-urdu      Hindi Devanagari → Urdu Arabic

    Examples:
      scriptconverter r2u salam
      scriptconverter u2r سلام
      scriptconverter r2h namaste
      scriptconverter u2h پاکستان
    """);
}
