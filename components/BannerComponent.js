
import { View, Image, StyleSheet } from 'react-native';


export default function BannerComponent() {
  
  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/na.jpeg')} // Replace with your image URL
        style={styles.image}
      />
    
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end', // Align button to the bottom
    alignItems: 'center',
    padding: 2,
    marginTop: 10
  },
  image: {
   
    width: '100%',
    height: 150,
    resizeMode: 'cover', // Make sure the image covers the screen
  },
  button: {
    backgroundColor: '#006838', // Red background for the button
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 50,
    marginBottom: 30, // Add space from the bottom
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
});
