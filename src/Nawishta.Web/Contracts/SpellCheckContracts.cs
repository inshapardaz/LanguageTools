namespace Nawishta.Web.Contracts;

public record SpellCheckRequest(string? Word);
public record SpellCheckBatchRequest(List<string>? Words);
public record SpellCheckReplaceRequest(string? SourceWord, string? Replacement);

public class SpellCheckSuggestion
{
    public required string Word { get; set; }
    public int Priority { get; set; }
}

public class SpellCheckResponse
{
    public bool Found { get; set; }
    public required string Word { get; set; }
    public string? Meaning { get; set; }
    public string? Pronunciation { get; set; }
    public List<SpellCheckSuggestion>? Suggestions { get; set; }
}
