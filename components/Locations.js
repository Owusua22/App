import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const { height: screenHeight } = Dimensions.get('window');

// React Native Vector Icons components
const SearchIcon = () => <Icon name="search" size={20} color="#4A5568" />;
const CloseIcon = () => <Icon name="close" size={24} color="#FFFFFF" />;
const ChevronIcon = ({ isExpanded }) => (
  <Icon 
    name={isExpanded ? "chevron-down" : "chevron-forward"} 
    size={16} 
    color="#4A5568" 
  />
);
const locations = [
  {
  region: "Greater Accra",
  towns: [
    { name: "Tema", delivery_fee: "Free delivery" },
    { name: "Kasoa", delivery_fee: "Free delivery" },
    { name: "Airport", delivery_fee: "Free delivery" },
    { name: "Weija", delivery_fee: "Free delivery" },
    { name: "Ashaiman", delivery_fee: "Free delivery" },
    { name: "Dome", delivery_fee: "Free delivery" },
    { name: "Madina", delivery_fee: "Free delivery" },
    { name: "Adenta", delivery_fee: "Free delivery" },
    { name: "Gbawe", delivery_fee: "Free delivery" },
    { name: "Nungua", delivery_fee: "Free delivery" },
    { name: "Teshie", delivery_fee: "Free delivery" },
    { name: "Nsakina", delivery_fee: "Free delivery" },
    { name: "Sowtoum", delivery_fee: "Free delivery" },
    { name: "Amasaman", delivery_fee: "Free delivery" },
    { name: "Ofankor", delivery_fee: "Free delivery" },
    { name: "Kwabenya", delivery_fee: "Free delivery" },
    { name: "Achimota", delivery_fee: "Free delivery" },
    { name: "Ablekuma", delivery_fee: "Free delivery" },
    { name: "Dansoman", delivery_fee: "Free delivery" },
    { name: "Sakumono", delivery_fee: "Free delivery" },
    { name: "Lashibi", delivery_fee: "Free delivery" },
    { name: "Oyibi", delivery_fee: "Free delivery" },
    { name: "Kokrobite", delivery_fee: "Free delivery" },
    { name: "Bortianor", delivery_fee: "Free delivery" },
    { name: "Abokobi", delivery_fee: "Free delivery" },
    { name: "Aburi", delivery_fee: "Free delivery" },
    { name: "Somanya", delivery_fee: "Free delivery" },
    { name: "Dodowa", delivery_fee: "Free delivery" },
    { name: "Prampram", delivery_fee: "Free delivery" },
    { name: "Kpone", delivery_fee: "Free delivery" },
    { name: "Shai Hills", delivery_fee: "Free delivery" },
    { name: "Ada Foah", delivery_fee: "Free delivery" },
    { name: "Dawhenya", delivery_fee: "Free delivery" },
    { name: "Afienya", delivery_fee: "Free delivery" },
    { name: "Dunkonah", delivery_fee: "Free delivery" },
    { name: "Apollonia", delivery_fee: "Free delivery" },
    { name: "Oshiyie", delivery_fee: "Free delivery" },
    { name: "Michel Camp", delivery_fee: "Free delivery" },
    { name: "Asutuare", delivery_fee: "Free delivery" },
    { name: "Akuse", delivery_fee: "Free delivery" },
    { name: "Kpoguno", delivery_fee: "Free delivery" },
    { name: "Obom", delivery_fee: "Free delivery" },
    { name: "Mamahuma", delivery_fee: "Free delivery" },
    { name: "Adabraka", delivery_fee: "Free delivery" },
    { name: "Cantoments", delivery_fee: "Free delivery" },
    { name: "Ridge", delivery_fee: "Free delivery" },
    { name: "Lapaz", delivery_fee: "Free delivery" },
    { name: "Osu", delivery_fee: "Free delivery" },
    { name: "Abeka", delivery_fee: "Free delivery" },
    { name: "New Town Kotobabi", delivery_fee: "Free delivery" },
    { name: "Dwowulu", delivery_fee: "Free delivery" },
    { name: "Agbobloshie", delivery_fee: "Free delivery" },
    { name: "East Legon", delivery_fee: "Free delivery" }
  ]
},
{
    region: "Ashanti",
  
  towns: [
    { name: "Kumasi", delivery_fee: 0 },
    { name: "Obuasi", delivery_fee: 0 },
    { name: "Konongo", delivery_fee: 0 },
    { name: "Mampong", delivery_fee: 0 },
    { name: "Ejisu", delivery_fee: 0 },
    { name: "Bekwai", delivery_fee: 0 },
    { name: "Effiduasi", delivery_fee: 0 },
    { name: "Juaben", delivery_fee: 0 },
    { name: "Asante Mampong", delivery_fee: 0 },
    { name: "Asokwa", delivery_fee: "Free delivery" },
    { name: "Oforikrom", delivery_fee: "Free delivery" },
    { name: "Bantama", delivery_fee: "Free delivery" },
    { name: "Tafo", delivery_fee: "Free delivery" },
    { name: "Asawasi", delivery_fee: "Free delivery" },
    { name: "Ahinsan", delivery_fee: "Free delivery" },
    { name: "Manhyia", delivery_fee: "Free delivery" },
    { name: "Suame", delivery_fee: "Free delivery" },
    { name: "Kwadaso", delivery_fee: "Free delivery" },
    { name: "Asokore Mampong", delivery_fee: "Free delivery" },
    { name: "Krofrom", delivery_fee: "Free delivery" },
    { name: "Ayigya", delivery_fee: "Free delivery" },
    { name: "Old Tafo", delivery_fee: "Free delivery" },
    { name: "Ahwiaa", delivery_fee: "Free delivery" },
    { name: "Agona", delivery_fee: 0 },
    { name: "Boadi", delivery_fee: "Free delivery" },
    { name: "Adansi", delivery_fee: 0 },
    { name: "Fomena", delivery_fee: 0 },
    { name: "Tepa", delivery_fee: 0 },
    { name: "Jacobu", delivery_fee: 0 },
    { name: "Asankare", delivery_fee: 0 },
    { name: "Akrokeri", delivery_fee: 0 },
    { name: "Agogo", delivery_fee: 0 },
    { name: "Konongo Odumasi", delivery_fee: 0 },
    { name: "Mamponteng", delivery_fee: "Free delivery" },
    { name: "Atimatim", delivery_fee: "Free delivery" },
    { name: "Pankrono", delivery_fee: "Free delivery" },
    { name: "Buokrom Estates", delivery_fee: "Free delivery" },
    { name: "Pankrono Estates", delivery_fee: "Free delivery" },
    { name: "Akrokerri", delivery_fee: 0 },
    { name: "Nyinahin", delivery_fee: 0 },
    { name: "Sepe", delivery_fee: "Free delivery" },
    { name: "Offinso", delivery_fee: 0 },
    { name: "Maakro", delivery_fee: "Free delivery" },
    { name: "Kotei", delivery_fee: "Free delivery" },
    { name: "Ayeduase", delivery_fee: "Free delivery" },
    { name: "Kenyase", delivery_fee: "Free delivery" },
    { name: "Ahenkro", delivery_fee: 0 },
    { name: "Akomadan Afrancho", delivery_fee: 0 },
    { name: "Kodie", delivery_fee: 0 },
    { name: "Kronom Afrancho", delivery_fee: "Free delivery" },
    { name: "Meduma", delivery_fee: "Free delivery" },
    { name: "Barekese", delivery_fee: 0 },
    { name: "Edwenase", delivery_fee: 0 },
    { name: "Brofoyedru", delivery_fee: 0 },
    { name: "Mampongten", delivery_fee: 0 },
    { name: "Nsuta", delivery_fee: 0 },
    { name: "Kwamo", delivery_fee: 0 },
    { name: "Asuokyene", delivery_fee: 0 },
    { name: "Ananekrom", delivery_fee: 0 },
    { name: "Aputuogya", delivery_fee: 0 },
    { name: "Asaam", delivery_fee: 0 },
    { name: "Asaatey", delivery_fee: 0 },
    { name: "Asempaneye", delivery_fee: 0 },
    { name: "Asuadee", delivery_fee: 0 },
    { name: "Asuoho", delivery_fee: 0 },
    { name: "Asuogya", delivery_fee: 0 },
    { name: "Atasamanso", delivery_fee: 0 },
    { name: "Atonsu", delivery_fee: 0 },
    { name: "Atwima Agogo", delivery_fee: 0 },
    { name: "Atwima Akyempim", delivery_fee: 0 },
    { name: "Atwima Apraman", delivery_fee: 0 },
    { name: "Atwima Atweban", delivery_fee: 0 },
    { name: "Atwima Dida", delivery_fee: 0 },
    { name: "Atwima Bonsu", delivery_fee: 0 },
    { name: "Atwima Dunkwa", delivery_fee: 0 },
    { name: "Atwima Kankana", delivery_fee: 0 },
    { name: "Atwima Koforidua", delivery_fee: 0 },
    { name: "Atwima Mansukrom", delivery_fee: 0 },
    { name: "Atwima Nkoransa", delivery_fee: 0 },
    { name: "Atwima Nkorbra", delivery_fee: 0 },
    { name: "Atwima Nkwanta", delivery_fee: 0 },
    { name: "Atwima Odumasi", delivery_fee: 0 },
    { name: "Atwima Oforikrom", delivery_fee: 0 },
    { name: "Atwima Tafrakwa", delivery_fee: 0 },
    { name: "Atwima Yayaaso", delivery_fee: 0 },
    { name: "Bonkron", delivery_fee: 0 },
    { name: "Bontodiase", delivery_fee: 0 },
    { name: "Bowiesakrom", delivery_fee: 0 },
    { name: "Dampai", delivery_fee: 0 },
    { name: "Diawuo", delivery_fee: 0 },
    { name: "Domenya", delivery_fee: 0 },
    { name: "Dukuben", delivery_fee: 0 },
    { name: "Esireso", delivery_fee: 0 },
    { name: "Fakopa", delivery_fee: 0 },
    { name: "Fenchi", delivery_fee: 0 },
    { name: "Foase", delivery_fee: 0 },
    { name: "Fumso", delivery_fee: 0 },
    { name: "Hia", delivery_fee: 0 },
    { name: "Hwidiem", delivery_fee: 0 },
    { name: "Jacobu", delivery_fee: 0 },
    { name: "Kaben", delivery_fee: 0 },
    { name: "Kankawura", delivery_fee: 0 },
    { name: "Kenyasi", delivery_fee: 0 },
    { name: "Kotey", delivery_fee: 0 },
    { name: "Kumedi", delivery_fee: 0 },
    { name: "Kwadwoakrom", delivery_fee: 0 },
    { name: "Kwaaman", delivery_fee: 0 },
    { name: "Libona", delivery_fee: 0 },
    { name: "Mampongteng", delivery_fee: 0 },
    { name: "Mankrong", delivery_fee: 0 },
    { name: "Nyamebekyere", delivery_fee: 0 },
    { name: "Obogu", delivery_fee: 0 },
    { name: "Ofari", delivery_fee: 0 },
    { name: "Ohwim", delivery_fee: 0 },
    { name: "Potromu", delivery_fee: 0 },
    { name: "Yaati", delivery_fee: 0 },
    { name: "Yawhima", delivery_fee: 0 },
    { name: "Yawyawkrom", delivery_fee: 0 },
    { name: "Yenya", delivery_fee: 0 }
  ]


  },
    {
      region: "Eastern",
      towns: [
        "Koforidua", "Nsawam", "Somanya", "Akwatia", "Kade", "Asamankese", "Suhum", "Kyebi", "Apedwa", "Atimpoku",
        "Akim Oda", "Akwamufie", "Akim Swedru", "Achiase", "Ayirebi", "Kukurantumi", "Coaltar", "Aburi", "Apirede",
        "Boti Falls", "Abenase", "Ahankrasu", "Akwamu", "Aseseeso", "Asuogyaman", "Ayensuano", "Bewunaba", "Boadua",
        "Dawa", "Dedeso", "Efidwase", "Fawomang", "Kpedze", "Mampong Nkwanta", "Nkawkaw", "Odumasi", "Otwereso",
        "Tutu Akuapem", "Abomosu", "Aburi Akuapem", "Adukrom", "Akwamu Adawso", "Akuse", "Akyem Akropong",
        "Akyem Asuokofi", "Akyem Awisa", "Akyem Osino", "Akyem Tafo", "Amanokrom", "Asamankor", "Bunso", "Dodowa",
        "Kibi", "Abengonya", "Abetifi", "Abompe", "Abrɛsɛ", "Abrewankor", "Abrɛwatɔr", "Achiaman", "Adawso",
        "Adjeikrom", "Aduamoa", "Afefikrom", "Afienya", "Afram Plains", "Agomeda", "Agorowɔ", "Agɔna",
        "Akpɛtɛshie", "Akrɔbɔngo", "Akwamu Adɔkɔ", "Akwamu Awɔnsaw", "Akwamu Tɔdzisu", "Akwamudɔbɔ", "Akwasiho",
        "Akyɛm Abuakwa", "Akyɛm Asenɔ", "Akyɛm Awɛna", "Akyɛm Batɔr", "Akyɛm Bomfa", "Akyɛm Hɛman", "Akyɛm Maase",
        "Akyɛmfɔr", "Amanforɔ", "Amuana Prasu", "Anuɔmah", "Apapam", "Apinamang", "Asamankɛse", "Asamankɔm",
        "Asuɔkɔr", "Atɔa", "Ayɛnkɔkɔr", "Ayɛnsudu", "Ayɛnsu Nkwanta", "Ayɛnsu Obutɔr", "Bawjiasi", "Bɛgorɔ",
        "Bɛkwɛ", "Dawu", "Diawuo", "Dokuata", "Domeabra", "Fawomanye", "Gbɛtsile", "Gbɔngɔr", "Huhunya", "Ismalia",
        "Jejeti", "Kɔbɔ", "Kɔfɔr Akwamu", "Kɔfɔr Akwapim", "Kɔkɔɔ", "Kɔkrɔbɔ", "Kɔkwaatwɔ", "Kwaobɛnyan",
        "Kwamu Tafo", "Kwanyako", "Kyɛkytɔn", "Mampɔŋ Nkatiɛ", "Mampɔŋ Nkwanta", "Mfɔŋkrɔnor", "Muoho", "Nankɔnɔr",
        "Nankɔwa", "Nkurankuran", "Nkwankɔ", "Nsɔngɔr", "Ntoɔnakɔr"
      ].map(town => ({ name: town, delivery_fee: 0 }))
    },
    {
      region: "Ahafo",
      towns: [
        "Duayaw Nkwanta",
        "Bechem",
        "Goaso",
        "Kukuom",
        "Acherensua",
        "Kenyasi",
        "Bomaa",
        "Techimantia",
        "Mim",
        "Hwidiem",
        "Sankore"
      ].map(town => ({ name: town, delivery_fee: 0 }))
    },
    {
        region: "Bono",
        towns: [
          { name: "Sunyani", delivery_fee: 0 },
          { name: "Wenchi", delivery_fee: 0 },
          { name: "Berekum", delivery_fee: 0 },
          { name: "Dormaa Ahenkro", delivery_fee: 0 },
          { name: "Sampa", delivery_fee: 0 },
          { name: "Fiapre", delivery_fee: 0 },
          { name: "Derma", delivery_fee: 0 },
          { name: "Duadwenem", delivery_fee: 0 },
          { name: "Drobo", delivery_fee: 0 },
          { name: "Banda Ahenkro", delivery_fee: 0 },
          { name: "Asemfro", delivery_fee: 0 },
          { name: "Tromo", delivery_fee: 0 },
          { name: "Tanoso", delivery_fee: 0 },
          { name: "Nsuatre", delivery_fee: 0 },
          { name: "Awua Domase", delivery_fee: 0 },
          { name: "Akokrom", delivery_fee: 0 },
          { name: "Yeji", delivery_fee: 0 },
          { name: "Amoma", delivery_fee: 0 },
          { name: "Atronie", delivery_fee: 0 },
          { name: "Bakoniaba", delivery_fee: 0 },
          { name: "Baakofri", delivery_fee: 0 },
          { name: "Brahoho", delivery_fee: 0 },
          { name: "Subinso", delivery_fee: 0 },
          { name: "Dwenem", delivery_fee: 0 },
          { name: "Awuakwa", delivery_fee: 0 },
          { name: "Adumakrom", delivery_fee: 0 },
          { name: "Akrodie", delivery_fee: 0 },
          { name: "Bono Manso", delivery_fee: 0 },
          { name: "Brekukrom", delivery_fee: 0 },
          { name: "Chiraa", delivery_fee: 0 },
          { name: "Dadiesoaba", delivery_fee: 0 },
          { name: "Domefiri", delivery_fee: 0 },
          { name: "Dwereboh", delivery_fee: 0 },
          { name: "Fonikrom", delivery_fee: 0 },
          { name: "Krabonso", delivery_fee: 0 },
          { name: "Kwatire", delivery_fee: 0 },
          { name: "Mehame", delivery_fee: 0 },
          { name: "Ntunsko", delivery_fee: 0 },
          { name: "Ofoase", delivery_fee: 0 },
          { name: "Oforikrom", delivery_fee: 0 },
          { name: "Okumaning", delivery_fee: 0 },
          { name: "Sang", delivery_fee: 0 },
          { name: "Seikwa", delivery_fee: 0 },
          { name: "Seneso", delivery_fee: 0 },
          { name: "Sukurunumu", delivery_fee: 0 },
          { name: "Tainso", delivery_fee: 0 },
          { name: "Yabraso", delivery_fee: 0 },
          { name: "Yawhima", delivery_fee: 0 },
          { name: "Yawmatwa", delivery_fee: 0 },
          { name: "Yefri", delivery_fee: 0 }
        ]
      },
      {
        region: "Bono East",
        towns: [
          { name: "Techiman", delivery_fee: 0 },
          { name: "Atebubu", delivery_fee: 0 },
          { name: "Kintampo", delivery_fee: 0 },
          { name: "Nkoranza", delivery_fee: 0 },
          { name: "Yeji", delivery_fee: 0 },
          { name: "Prang", delivery_fee: 0 },
          { name: "Kintampo North", delivery_fee: 0 },
          { name: "Jema", delivery_fee: 0 },
          { name: "Kajaji", delivery_fee: 0 },
          { name: "Krabonso", delivery_fee: 0 },
          { name: "Atuabeng", delivery_fee: 0 },
          { name: "Awisam", delivery_fee: 0 },
          { name: "Babatokuma", delivery_fee: 0 },
          { name: "Badu", delivery_fee: 0 },
          { name: "Baten", delivery_fee: 0 },
          { name: "Branam", delivery_fee: 0 },
          { name: "Busunya", delivery_fee: 0 },
          { name: "Dwenem", delivery_fee: 0 },
          { name: "Gyarkokrom", delivery_fee: 0 },
          { name: "Kaekye", delivery_fee: 0 },
          { name: "Kanyasi", delivery_fee: 0 },
          { name: "Kokrua", delivery_fee: 0 },
          { name: "Kyira", delivery_fee: 0 },
          { name: "Mansam", delivery_fee: 0 },
          { name: "Mansie", delivery_fee: 0 },
          { name: "Nante", delivery_fee: 0 },
          { name: "Nkokua", delivery_fee: 0 },
          { name: "Nkwantanan", delivery_fee: 0 },
          { name: "Nsuntra", delivery_fee: 0 },
          { name: "Ntrambasere", delivery_fee: 0 },
          { name: "Ofoase", delivery_fee: 0 },
          { name: "Oforikrom", delivery_fee: 0 },
          { name: "Okumaning", delivery_fee: 0 },
          { name: "Pepiatinankor", delivery_fee: 0 },
          { name: "Seikwa", delivery_fee: 0 },
          { name: "Sokwan", delivery_fee: 0 },
          { name: "Tanom", delivery_fee: 0 },
          { name: "Techiman North", delivery_fee: 0 },
          { name: "Tuobodom", delivery_fee: 0 }
        ]
      }, 
      {
        region: "Central",
      towns: [
       
        "Cape Coast", "Winneba", "Swedru", "Saltpond", "Elmina", "Anomabo", "Apam", "Biriwa", "Dunkwa-on-Offin",
        "Agona Swedru", "Awutu Breku", "Kasoa", "Komenda", "Mankessim", "Moree", "Twifo Praso", "Assin Fosu",
        "Bawjiase", "Ajumako", "Abura Dunkwa", "Abrem Agona", "Agona Nsaba", "Akropong Akwapim", "Akwatia",
        "Amanfro", "Amansuri", "Amasaman", "Anto", "Apewosika", "Asakraka", "Asikuma", "Assin Achireso",
        "Assin Dadieso", "Assin Jamai", "Assin Kushea", "Assin Manso", "Assin Praso", "Assin Sienchem",
        "Assin Swedru", "Asueyi", "Atabadzie", "Awukugua", "Ayensudo", "Banso", "Bawjiase", "Bemam", "Besease",
        "Bobikuma", "Bodwiasi", "Brakwa", "Breman Asikuma", "Breman Baako", "Breman Bedu", "Breman Essiam",
        "Breman Kuntunase", "Breman Kwa", "Breman Nkosim", "Breku Amanfoh", "Ejumako", "Ekumfi Abor",
        "Ekumfi Akwaada", "Ekumfi Amenfukru", "Ekumfi Ebabu", "Ekumfi Imuna", "Ekumfi Kyekyewere",
        "Ekumfi Nanabin", "Ekumfi Otuam", "Ekumfi Yakaku", "Enyan Abasie", "Enyan Abowiam", "Enyan Achiase",
        "Enyan Adenya", "Enyan Agemam", "Enyan Ahenkofi", "Enyan Akohwaa", "Enyan Akrofrom", "Enyan Amanoka",
        "Enyan Amuantem", "Enyan Anaafo", "Enyan Anakum", "Enyan Ankanfo", "Enyan Anyankrom", "Enyan Arubakrom",
        "Enyan Asaasegye", "Enyan Asaamang", "Enyan Assin", "Enyan Assineye", "Enyan Awurawa", "Enyan Ayekkrom",
        "Enyan Ayipey", "Enyan Bawjiase", "Enyan Behenakrom", "Enyan Bosingiri", "Enyan Deensuano",
        "Enyan Dwendamen", "Enyan Edwinasi", "Enyan Egyadam", "Enyan Eikrom", "Enyan Ekumfua", "Enyan Ekurana",
        "Enyan Emikrom", "Enyan Enyan Abaasa", "Enyan Enyan Adentan", "Enyan Enyan Akuran", "Enyan Enyan Apaman",
        "Enyan Enyan Ayiresu", "Enyan Enyan Dadiese", "Enyan Enyan Denkyira", "Enyan Enyan Maim",
        "Enyan Enyan Nsunsuam", "Enyan Enyan Ntoaman", "Enyan Enyan Nyenye", "Enyan Enwansue", "Enyan Esuohyiau",
        "Enyan Faana", "Enyan Fasi", "Fatik", "Gomoa Abora", "Gomoa Aburansa", "Gomoa Adamrobe", "Gomoa Afransi",
        "Gomoa Agyarkrom", "Gomoa Akaati", "Gomoa Akyena", "Gomoa Akramang", "Gomoa Akraway", "Gomoa Akworkrom",
        "Gomoa Anaafo", "Gomoa Antsadze", "Gomoa Anyinase", "Gomoa Apam", "Gomoa Ashram", "Gomoa Awombew",
        "Gomoa Awombrew", "Gomoa Ayayee", "Gomoa Bodee", "Gomoa Buadukrom", "Gomoa Dasum", "Gomoa Dawuman",
        "Gomoa Dego", "Gomoa Dompem", "Gomoa Fawomangba", "Gomoa Fetteh", "Gomoa Gyankobu", "Gomoa Jukwa",
        "Gomoa Labadi", "Gomoa Lome", "Gomoa Manfort", "Gomoa Mfom", "Gomoa Nkwantanan", "Gomoa Odumasi Krobo",
        "Gomoa Oguanya", "Gomoa Ohuniachi", "Gomoa Onyinkye", "Gomoa Osamankwamu", "Gomoa Simbrofo",
        "Gomoa Tsowhemen", "Gomoa Tuakwa", "Gomoa Tuata", "Gomoa Twefi", "Gomoa Zabrama", "Gomoa Zongo",
        "Guantuabuo", "Obuan Adumsua", "Obuan Apemenyinsua", "Obuan Asikuma", "Obuan Atenfi", "Obuan Lafroma",
        "Obuan Nanaa", "Obuan Nketiafa"
      ].map(name => ({ name, delivery_fee: 0 }))
      
},
{
    region: "North East",
    towns:[

    "Nalerigu", "Gambaga", "Walewale", "Bunkpurugu", "Chereponi", "Yunyo", "Nangodi", "Kpatinga",
  "Gushegu", "Nakpanduri", "Nawuni", "Kugri", "Langbinsi", "Namogu", "Zakoli", "Naringo",
  "Nayili", "Sambu", "Kpalun", "Gbintiri", "Sakpegu", "Kpembi", "Kuga", "Nansam", "Nagbanayili",
  "Yosahi", "Jangli", "Kpasinkpe", "Adibo", "Tantala", "Wulasi", "Zanduga", "Yogri",
  "Kpalnori", "Dimali", "Kpatihi", "Kpatinga Nyoglo", "Kpatinga Tindama", "Kunyibili",
  "Kubintini", "Kubore", "Kumbo", "Kunkon", "Laasi", "Lakpun", "Lambubu"
].map(name => ({ name, delivery_fee: 0 }))
},

{
    region: "Upper West",
    towns:[
        "Wa", "Tumu", "Lawra", "Nandom", "Jirapa", "Nadowli", "Kaleo", "Hamile", "Funsi", "Bulenga",
  "Issa", "Wechiau", "Dorimon", "Banje", "Tantala", "Sambu", "Gwollu", "Tuna", "Dommo", "Kperisi",
  "Zambo", "Eremon", "Piisi", "Goriyiri", "Baariu", "Buropuon", "Duu", "Gemari", "Guo", "Hain",
  "Han", "Juori", "Kadyiri", "Kapemba", "Kporju", "Kpongu", "Kuri", "Ku", "Kuveli", "Lasse",
  "Manwe", "Naah", "Namo", "Napon", "Nator", "Niu", "Pina", "Puffien", "Sang", "Sareu",
  "Sendua", "Serekpere", "Sii", "Singiri", "Tantu", "Tisa", "Yagtuuri", "Yizusi"
].map(name => ({ name, delivery_fee: 0 }))
    
},
{
    region: "Oti",
    towns:[
        "Dambai", "Kadjebi", "Jasikan", "Nkwanta", "Biakoye", "Kadjebi-Asandan", "Bakpa", "Brewaniase",
  "Dodi-Papae", "Kpeven", "Kpedze", "Leklebi", "Kpetsu", "Akrofu", "Penyi", "Dwenye", "Sifor",
  "Matse", "Gbefi", "Nkonya Ahenkro", "Nkonya Asakyiri", "Nkonya Gborbu", "Nkonya Kwamikrom",
  "Nkonya Ntsumuru", "Nkonya Wurupong", "Kyriahi", "Akrofu-Nyatike", "Kalakpa", "Ntravole",
  "Akrodie", "Awameye", "Tsakye", "Nsunkwa", "Santrokofi", "Honuta", "Todome", "Kpata",
  "Ahamansu", "Abati", "Tapa", "Gonan", "Abotoyi", "Bumbua", "Mempeasem", "Bumbuzure"
].map(name => ({ name, delivery_fee: 0 }))
    
},
{
    region: "Western",
    towns:[
        
        "Sefwi Wiawso", "Aowin", "Enchi", "Akontombra", "Boinzen", "Agyemankrom", "Amoaya", "Awisasu",
        "Bawdie", "Bencheman", "Bodadee", "Boako", "Brahoho", "Chiandan", "Dadieso", "Deheman", "Diabaa",
        "Diewuokor", "Dominasi", "Gulushi", "Hwediem", "Jakobu", "Juabeng", "Kabenlangruma", "Kamajeku",
        "Kantankoran", "Kawamo", "Kawawhir", "Kofikrom", "Kwakutsir", "Kwasukrom", "Mpuntenamu", "Mfuma",
        "Nanakrom", "Ndawayah", "Ndoblo", "Nkrabah", "Nsuhyien", "Numunamu", "Oseikrom", "Paso", "Patingo",
        "Samogrokrom", "Sewum", "Siwabrekrom", "Subinkom", "Sukuakyi", "Tanokrom", "Topremang",
        "Yaabokrom", "Yaakrom", "Yabraso", "Yakumukrom"
      ].map(name => ({ name, delivery_fee: 0 }))
},
{
    region: "Volta",
    towns:[
        "Ho", "Keta", "Hohoe", "Sogakofe", "Anloga", "Akatsi", "Kpando", "Nkwanta", "Dzemeni", "Matse",
        "Dzodze", "Have", "Vane", "Adidome", "Amedzofe", "Avatime", "Kadjebi", "Vakpo", "Kpeve",
        "Golokuati", "Dzolokpuita", "Alavanyo", "Tsito", "Kpogedi", "Kpalime", "Dzodze", "Leklebi Agbesia",
        "Ve-Golokuati", "Adaklu Wumako", "Akoviefe", "Anfoega", "Avenor", "Ave-Xawieda", "Awate",
        "Awudome Tsilu", "Awutungor", "Baglo", "Bakpa", "Battor", "Brewanaiase", "Dakpotoku Tafi",
        "Dohego", "Dodi-Papae", "Fievie-Dugame", "Gbadzeme", "Gbefi Wheta", "Goefe Adimakope", "Gofe Battor",
        "Gonu", "Hodzo", "Horti", "Kalu", "Klave", "Kodiabe", "Kpando Tokor", "Kpatsa", "Liliaxe",
        "Logokope", "Lomnava", "Matse Logoku", "Matse Tefle", "Nkonya", "Nogokpo", "Nohyieso", "Ologu",
        "Penyi", "Sasekpor", "Saviewe", "Sovie", "Taviefe", "Tegame", "Tsawoe", "Tsiame"
      ].map(name => ({ name, delivery_fee: 0 }))
      
    
},

    ];


// Updated utility function to check if delivery is free
// Only "Free delivery" string is considered truly free, 0 means no delivery available (isFree = false)
const isFreeDelivery = (deliveryFee) => {
  return deliveryFee === "Free delivery";
};

// Utility function to format delivery fee for display
const formatDeliveryFee = (deliveryFee) => {
  if (deliveryFee === "Free delivery") {
    return "Free";
  }
  if (deliveryFee === 0) {
    return "N/A";
  }
  return `GH₵${deliveryFee}`;
};

// Utility function to get delivery fee color
const getDeliveryFeeColor = (deliveryFee) => {
  if (deliveryFee === "Free delivery") {
    return {
      background: "#C6F6D5",
      text: "#22543D"
    };
  }
  if (deliveryFee === 0) {
    return {
      background: "#FED7D7", 
      text: "#C53030"
    };
  }
  return {
    background: "#BEE3F8", 
    text: "#2B6CB0"
  };
};

const LocationsModal = ({ isVisible, onClose, onLocationSelect, selectedLocation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRegions, setExpandedRegions] = useState(new Set());

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isVisible) {
      // Start with all regions collapsed
      setExpandedRegions(new Set());
      setSearchQuery('');
    } else {
      setSearchQuery('');
      setExpandedRegions(new Set());
    }
  }, [isVisible]);

  const filteredLocations = useMemo(() => {
    if (!searchQuery) return locations;
    
    const filtered = locations.map(region => ({
      ...region,
      towns: region.towns.filter(town => 
        town.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        region.region.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(region => region.towns.length > 0);

    // Auto-expand regions when searching to show results
    if (searchQuery.trim() && filtered.length > 0) {
      setExpandedRegions(new Set(filtered.map(region => region.region)));
    }

    return filtered;
  }, [searchQuery]);

  const toggleRegion = (regionName) => {
    const newExpanded = new Set(expandedRegions);
    if (newExpanded.has(regionName)) {
      newExpanded.delete(regionName);
    } else {
      newExpanded.add(regionName);
    }
    setExpandedRegions(newExpanded);
  };

  const handleLocationSelect = (town, region) => {
    const locationData = { 
      town, 
      region,
      deliveryFee: town.delivery_fee,
      // CRITICAL: Only "Free delivery" string sets isFree to true, 0 sets isFree to false
      isFree: isFreeDelivery(town.delivery_fee) // This will be false when delivery_fee is 0
    };
    onLocationSelect(locationData);
  };

  const closeModal = () => {
    setSearchQuery('');
    onClose();
  };

  // Custom fee display logic for town items
  const getDeliveryFeeDisplay = (fee) => {
    if (fee === 0) {
      return "N/A"; // No delivery available
    }
    if (fee === "Free delivery") {
      return "Free Delivery"; // Free delivery available
    }
    return `GH₵${fee}`; // Paid delivery
  };

  const renderTownItem = (town, regionName, index) => {
    const isSelected = selectedLocation?.town?.name === town.name && 
                      selectedLocation?.region === regionName;
    const colors = getDeliveryFeeColor(town.delivery_fee);
    
    return (
      <TouchableOpacity
        key={`${regionName}-${town.name}-${index}`} 
        style={[
          styles.townItem,
          isSelected && styles.selectedTownItem
        ]}
        onPress={() => handleLocationSelect(town, regionName)}
        activeOpacity={0.7}
      >
        <View style={styles.townContent}>
          <Text style={[
            styles.townName,
            isSelected && styles.selectedTownName
          ]}>
            {town.name}
          </Text>
        </View>
        <View style={[
          styles.deliveryFeeTag,
          { backgroundColor: colors.background }
        ]}>
          <Text style={[
            styles.deliveryFeeText,
            { color: colors.text }
          ]}>
            {getDeliveryFeeDisplay(town.delivery_fee)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={closeModal}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Delivery Location</Text>
            <TouchableOpacity
              onPress={closeModal}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <CloseIcon />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.contentContainer}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={true}
          >
            {filteredLocations.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No locations found</Text>
              </View>
            ) : (
              filteredLocations.map((region) => {
                const freeDeliveryCount = region.towns.filter(town => isFreeDelivery(town.delivery_fee)).length;
                
                return (
                  <View key={region.region} style={styles.regionContainer}>
                    <TouchableOpacity
                      style={styles.regionHeader}
                      onPress={() => toggleRegion(region.region)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.regionInfo}>
                        <Text style={styles.regionName}>{region.region}</Text>
                    
                      </View>
                      <View style={styles.regionMeta}>
                        <View style={styles.townCount}>
                          <Text style={styles.townCountText}>{region.towns.length} towns</Text>
                        </View>
                        <ChevronIcon isExpanded={expandedRegions.has(region.region)} />
                      </View>
                    </TouchableOpacity>

                    {expandedRegions.has(region.region) && (
                      <View style={styles.townsList}>
                        {region.towns.map((town, index) => (
                          <View key={`${region.region}-${town.name}-${index}`}>
                            {renderTownItem(town, region.region, index)}
                            {index < region.towns.length - 1 && (
                              <View style={styles.townSeparator} />
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: screenHeight * 0.8,
    overflow: 'hidden',
    flex: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#059669',
    flexShrink: 0,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F7FAFC',
    flexShrink: 0,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2D3748',
  },
  contentContainer: {
    maxHeight: screenHeight * 0.8 - 150,
    backgroundColor: 'white',
  },
  scrollContentContainer: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#A0AEC0',
    fontSize: 14,
  },
  regionContainer: {
    backgroundColor: 'white',
  },
  regionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F7FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  regionInfo: {
    flex: 1,
  },
  regionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A202C',
  },
  freeDeliveryIndicator: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
    marginTop: 2,
  },
  regionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  townCount: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  townCountText: {
    fontSize: 12,
    color: '#4A5568',
  },
  townsList: {
    backgroundColor: 'white',
  },
  townItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    paddingHorizontal: 24,
    backgroundColor: 'white',
  },
  selectedTownItem: {
    backgroundColor: '#EBF8FF',
    borderLeftWidth: 3,
    borderLeftColor: '#059669',
  },
  townContent: {
    flex: 1,
  },
  townName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A202C',
  },
  selectedTownName: {
    color: '#059669',
    fontWeight: '600',
  },
  deliveryFeeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deliveryFeeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  townSeparator: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 24,
  },
});

export default LocationsModal;