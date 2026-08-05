import { Stack, Text, Badge, Group, List, Paper } from '@mantine/core';

interface Meaning {
  definition: string;
  examples?: string[];
  label?: string;
}

interface WordSense {
  partOfSpeech?: string;
  grammar?: string;
  meanings?: Meaning[];
}

interface WordLink {
  linkType: string | number;
  targetWord: string;
  note?: string;
}

interface ArticleData {
  pronunciation?: string;
  senses?: WordSense[];
  links?: WordLink[];
  rawDefinition?: string;
}

const LINK_TYPE_MAP = ['Synonym', 'Antonym', 'Root', 'DerivedForm', 'Related', 'Narrower', 'Broader', 'SeeAlso'];

function getLinkTypeName(lt: string | number): string {
  if (typeof lt === 'number') return LINK_TYPE_MAP[lt] || 'Related';
  return lt;
}

export default function ArticleView({ article }: { article: ArticleData }) {
  if (!article) return null;
  const { pronunciation, senses, links, rawDefinition } = article;
  const hasSenses = senses && senses.length > 0;
  const hasLinks = links && links.length > 0;

  return (
    <Stack gap="xs">
      {pronunciation && (
        <Text size="sm" c="dimmed" fs="italic">/{pronunciation}/</Text>
      )}

      {hasSenses ? (
        senses!.map((sense, si) => (
          <div key={si}>
            {sense.partOfSpeech && (
              <Group gap="xs" mb={4}>
                <Badge variant="light" color="blue" size="sm">{sense.partOfSpeech}</Badge>
                {sense.grammar && <Text size="xs" c="dimmed">({sense.grammar})</Text>}
              </Group>
            )}
            <List type="ordered" size="sm" spacing={4}>
              {sense.meanings?.map((m, mi) => (
                <List.Item key={mi}>
                  {m.label && <Badge variant="outline" size="xs" mr={4}>{m.label}</Badge>}
                  <Text component="span" size="sm">{m.definition}</Text>
                  {m.examples && m.examples.length > 0 && (
                    <Stack gap={2} mt={2} ml="sm">
                      {m.examples.map((ex, ei) => (
                        <Text key={ei} size="xs" fs="italic" c="dimmed">"{ex}"</Text>
                      ))}
                    </Stack>
                  )}
                </List.Item>
              ))}
            </List>
          </div>
        ))
      ) : rawDefinition ? (
        <div dangerouslySetInnerHTML={{ __html: rawDefinition }} style={{ fontSize: '0.9rem', lineHeight: 1.6 }} />
      ) : (
        <Text size="sm" c="dimmed" fs="italic">No definition available.</Text>
      )}

      {hasLinks && (
        <Paper p="xs" bg="gray.0" radius="sm" mt="xs">
          {Object.entries(
            links!.reduce<Record<string, string[]>>((acc, l) => {
              const type = getLinkTypeName(l.linkType);
              if (!acc[type]) acc[type] = [];
              acc[type].push(l.targetWord);
              return acc;
            }, {})
          ).map(([type, words]) => (
            <Text key={type} size="xs">
              <Text component="span" fw={600}>{type}:</Text> {words.join(', ')}
            </Text>
          ))}
        </Paper>
      )}
    </Stack>
  );
}
