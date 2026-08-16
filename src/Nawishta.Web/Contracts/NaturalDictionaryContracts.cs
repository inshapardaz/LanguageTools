using Nawishta.NaturalDictionary.Models;

namespace Nawishta.Web.Contracts;

public record ArticleRequest(
    string? Headword,
    string? Pronunciation,
    List<WordSense>? Senses,
    List<WordLink>? Links,
    string? RawDefinition,
    string? Alternates);

public record MergeRequest(List<long>? ArticleIds, string? Headword);
