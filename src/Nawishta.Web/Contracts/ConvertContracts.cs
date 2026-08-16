namespace Nawishta.Web.Contracts;

public record ConvertRequest(string Text, string From, string To, bool Details = false);
