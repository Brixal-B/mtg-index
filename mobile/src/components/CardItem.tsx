import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Card } from '@/types';

interface CardItemProps {
  card: Card;
  onPress?: (card: Card) => void;
}

const CardItem: React.FC<CardItemProps> = ({ card, onPress }) => {
  const handlePress = () => {
    if (onPress) {
      onPress(card);
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{card.name}</Text>
        <Text style={styles.cardType}>{card.type}</Text>
        <Text style={styles.cardSet}>{card.setName} ({card.set})</Text>
        <Text style={styles.cardRarity}>{card.rarity}</Text>
      </View>
      {card.imageUrl && (
        <Image source={{ uri: card.imageUrl }} style={styles.cardImage} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    marginVertical: 4,
    marginHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardInfo: {
    flex: 1,
    paddingRight: 16,
  },
  cardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  cardType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  cardSet: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  cardRarity: {
    fontSize: 12,
    color: '#999',
    textTransform: 'capitalize',
  },
  cardImage: {
    width: 60,
    height: 84,
    borderRadius: 4,
  },
});

export default CardItem;