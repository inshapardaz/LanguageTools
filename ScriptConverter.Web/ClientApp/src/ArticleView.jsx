/**
 * Renders a structured dictionary article with pronunciation, senses (grouped by
 * part of speech, each with multiple meanings and examples), and word links
 * (synonyms, antonyms, related words, etc.).
 *
 * Falls back to raw HTML definition when no structured senses are available.
 */
export default function ArticleView({ article }) {
  if (!article) return null;

  const { pronunciation, senses, links, rawDefinition } = article;
  const hasSenses = senses && senses.length > 0;
  const hasLinks = links && links.length > 0;

  return (
    <div className="article-view">
      {/* Pronunciation */}
      {pronunciation && (
        <div className="av-pronunciation">
          <span className="av-pron-label">Pronunciation:</span>
          <span className="av-pron-value">/{pronunciation}/</span>
        </div>
      )}

      {/* Structured senses */}
      {hasSenses ? (
        <div className="av-senses">
          {senses.map((sense, si) => (
            <div key={si} className="av-sense">
              {/* Part of speech header */}
              {sense.partOfSpeech && (
                <div className="av-pos">
                  <span className="av-pos-label">{sense.partOfSpeech}</span>
                  {sense.grammar && <span className="av-grammar">{sense.grammar}</span>}
                </div>
              )}

              {/* Meanings */}
              <ol className="av-meanings">
                {sense.meanings && sense.meanings.map((meaning, mi) => (
                  <li key={mi} className="av-meaning">
                    <span className="av-def">
                      {meaning.label && <span className="av-label">{meaning.label}</span>}
                      {meaning.definition}
                    </span>

                    {/* Examples */}
                    {meaning.examples && meaning.examples.length > 0 && (
                      <ul className="av-examples">
                        {meaning.examples.map((ex, ei) => (
                          <li key={ei} className="av-example">{ex}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      ) : rawDefinition ? (
        /* Fallback to raw HTML definition */
        <div className="av-raw" dangerouslySetInnerHTML={{ __html: rawDefinition }} />
      ) : (
        <div className="av-empty">No definition available.</div>
      )}

      {/* Word links */}
      {hasLinks && (
        <div className="av-links">
          <LinkGroup links={links} type="Synonym" label="Synonyms" />
          <LinkGroup links={links} type="Antonym" label="Antonyms" />
          <LinkGroup links={links} type="Root" label="Root" />
          <LinkGroup links={links} type="DerivedForm" label="Derived forms" />
          <LinkGroup links={links} type="Related" label="Related" />
          <LinkGroup links={links} type="SeeAlso" label="See also" />
          <LinkGroup links={links} type="Narrower" label="Narrower terms" />
          <LinkGroup links={links} type="Broader" label="Broader terms" />
        </div>
      )}
    </div>
  );
}

function LinkGroup({ links, type, label }) {
  // linkType comes from the API as an integer (enum value) or string
  const filtered = links.filter(l => {
    const lt = typeof l.linkType === 'string' ? l.linkType : linkTypeToString(l.linkType);
    return lt.toLowerCase() === type.toLowerCase();
  });

  if (filtered.length === 0) return null;

  return (
    <div className="av-link-group">
      <span className="av-link-label">{label}:</span>
      <span className="av-link-words">
        {filtered.map((link, i) => (
          <span key={i} className="av-link-word">
            {link.targetWord}
            {link.note && <span className="av-link-note"> ({link.note})</span>}
            {i < filtered.length - 1 && ', '}
          </span>
        ))}
      </span>
    </div>
  );
}

function linkTypeToString(value) {
  const map = ['Synonym', 'Antonym', 'Root', 'DerivedForm', 'Related', 'Narrower', 'Broader', 'SeeAlso'];
  return map[value] || 'Related';
}
