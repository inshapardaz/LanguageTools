namespace ScriptConverter.Converters;

/// <summary>
/// Interface for all script converters.
/// </summary>
public interface IScriptConverter
{
    /// <summary>
    /// Converts the input text from one script to another.
    /// </summary>
    /// <param name="input">The text to convert.</param>
    /// <returns>The converted text.</returns>
    string Convert(string input);
}
