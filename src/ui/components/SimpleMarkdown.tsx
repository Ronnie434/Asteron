import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Typography } from './Typography';
import { useTheme } from '../../contexts/ThemeContext'; // Dynamic theme

interface SimpleMarkdownProps {
  content: string;
}

export function SimpleMarkdown({ content }: SimpleMarkdownProps) {
  const { colors } = useTheme(); // Access dynamic colors
  
  // Split by newlines
  const lines = content.split('\n');

  return (
    <View style={styles.container}>
      {lines.map((line, index) => {
        const key = `${index}-${line.substring(0, 10)}`;
        
        // Skip empty lines (layout handled by margin)
        if (!line.trim()) {
           return <View key={key} style={styles.spacer} />;
        }

        // H1: # Title
        if (line.startsWith('# ')) {
          return (
            <View key={key} style={styles.h1Container}>
              <Typography variant="title1" style={{ color: colors.primary, marginBottom: 8 }}>
                {line.replace('# ', '')}
              </Typography>
              <View style={{ height: 1, backgroundColor: colors.separator, width: '100%' }} />
            </View>
          );
        }

        // H2: ## Title
        if (line.startsWith('## ')) {
          return (
            <Typography key={key} variant="title3" style={[styles.h2, { color: colors.text }]}>
              {line.replace('## ', '')}
            </Typography>
          );
        }

        // H3: ### Title
        if (line.startsWith('### ')) {
          return (
            <Typography key={key} variant="headline" style={[styles.h3, { color: colors.text }]}>
              {line.replace('### ', '')}
            </Typography>
          );
        }

        // List item: - Item
        if (line.trim().startsWith('- ')) {
          return (
            <View key={key} style={styles.listItem}>
              <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
              <Typography variant="body" style={{ color: colors.textSecondary, flex: 1, lineHeight: 24 }}>
                {line.replace('- ', '').replace(/\*\*/g, '')}
              </Typography>
            </View>
          );
        }

        // Table row (Card style)
        if (line.includes('|')) {
           // Skip separator lines like |---|---|
           if (line.match(/\|[-]+\|/)) return null;

           const cols = line.split('|').filter(c => c.trim());
           return (
             <View key={key} style={[styles.tableRow, { backgroundColor: colors.card, borderColor: colors.separator }]}>
               {cols.map((col, i) => (
                 <View key={i} style={[styles.tableCol, i < cols.length - 1 && { borderRightWidth: 1, borderRightColor: colors.separator }]}>
                    <Typography variant="caption1" style={{ color: colors.text }}>
                      {col.trim()}
                    </Typography>
                 </View>
               ))}
             </View>
           );
        }

        // Clean up bold syntax **text** for plain paragraphs
        // We will simple-parse bold if needed, but for now just stripping mostly or keeping plain
        const isBold = line.includes('**');
        const cleanLine = line.replace(/\*\*/g, '');

        return (
          <Typography key={key} variant="body" style={[styles.paragraph, { color: colors.textSecondary }]}>
            {cleanLine}
          </Typography>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  spacer: {
    height: 16,
  },
  h1Container: {
    marginTop: 32,
    marginBottom: 24,
  },
  h2: {
    marginTop: 24,
    marginBottom: 12,
  },
  h3: {
    marginTop: 20,
    marginBottom: 8,
  },
  paragraph: {
    marginBottom: 4,
    lineHeight: 24,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingLeft: 4,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 9,
    marginRight: 12,
  },
  tableRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 8,
  },
  tableCol: {
    flex: 1,
    paddingHorizontal: 8,
    justifyContent: 'center',
  }
});
