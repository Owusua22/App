import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useDispatch } from 'react-redux';
import { loginCustomer } from '../redux/slice/customerSlice';
import { useNavigation } from '@react-navigation/native';

const LoginScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const [formData, setFormData] = useState({
    contactNumber: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async () => {
    const { contactNumber, password } = formData;

    if (!contactNumber || !password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    setLoading(true);

    try {
      await dispatch(loginCustomer({ contactNumber, password })).unwrap();
      Alert.alert('Success', 'Login successful!', [
        { text: 'OK', onPress: () => navigation.navigate('Home') },
      ]);
    } catch (error) {
      Alert.alert('Error', error.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/frankoIcon.png')}
        style={styles.logo}
      />
      <Text style={styles.title}>Login</Text>

      <View style={styles.inputContainer}>
        <Icon name="call-outline" size={20} color="#666" style={styles.icon} />
        <TextInput
          placeholder="Contact Number"
          style={styles.input}
          keyboardType="phone-pad"
          value={formData.contactNumber}
          onChangeText={(value) => handleChange('contactNumber', value)}
        />
      </View>

      <View style={styles.inputContainer}>
        <Icon name="lock-closed-outline" size={20} color="#666" style={styles.icon} />
        <TextInput
          placeholder="Password"
          style={styles.input}
          secureTextEntry
          value={formData.password}
          onChangeText={(value) => handleChange('password', value)}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007BFF" style={styles.loader} />
      ) : (
        <TouchableOpacity style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
        <Text style={styles.footerText}>
          Don’t have an account? <Text style={styles.linkText}>Register</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
   
    alignItems: 'center',
    padding: 26,
    backgroundColor: '#F9F9F9',
  },
  logo: {
    width: 130,
    height: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingHorizontal: 8,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 50,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#006838',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerText: {
    fontSize: 14,
    color: '#555',
  },
  linkText: {
    color: '#007BFF',
    fontWeight: 'bold',
  },
  loader: {
    marginVertical: 10,
  },
});

export default LoginScreen;