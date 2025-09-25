import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Alert,
  Platform,
  Dimensions,
  Animated
} from 'react-native';
import { baseballDrills, Drill, PracticePlan } from './Data/Models/baseballDrills';
import BaseballField from './Field/BaseballField';

export default function App() {
  const { height: screenHeight, width: screenWidth } = Dimensions.get('window');
  
  // More conservative safe area calculations
  const isLargeScreen = screenHeight > 800;
  const statusBarHeight = Platform.OS === 'android' 
    ? (isLargeScreen ? 50 : 45)  // Larger screens often have bigger notches
    : 50;
  const bottomPadding = Platform.OS === 'android' 
    ? (isLargeScreen ? 30 : 25)  // More padding for navigation buttons
    : 40;
  
  const [drills, setDrills] = useState<Drill[]>(baseballDrills);
  const [practicePlans, setPracticePlans] = useState<PracticePlan[]>([]);
  const [selectedDrills, setSelectedDrills] = useState<Set<string>>(new Set());
  const [selectedDrillsOrder, setSelectedDrillsOrder] = useState<string[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPracticePlans, setShowPracticePlans] = useState(false);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [showFieldDiagram, setShowFieldDiagram] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showPracticePlanning, setShowPracticePlanning] = useState(false);
  
  // Animation values
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.5);
  const slideAnim = new Animated.Value(50);
  const dot1Anim = new Animated.Value(0.3);
  const dot2Anim = new Animated.Value(0.3);
  const dot3Anim = new Animated.Value(0.3);
  const [newDrill, setNewDrill] = useState({
    title: '',
    category: '',
    description: ''
  });
  const [newPlanName, setNewPlanName] = useState('');
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editingDrills, setEditingDrills] = useState<Drill[]>([]);
  const [editingNotes, setEditingNotes] = useState<string>('');
  const [showNotesEdit, setShowNotesEdit] = useState<string | null>(null);
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PracticePlan | null>(null);
  const [editingNotesInDetail, setEditingNotesInDetail] = useState(false);

  // Welcome screen animation
  useEffect(() => {
    if (showWelcome) {
      // Start animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();

      // Animate loading dots
      const animateDots = () => {
        const createDotAnimation = (dotAnim: Animated.Value, delay: number) => {
          return Animated.loop(
            Animated.sequence([
              Animated.timing(dotAnim, {
                toValue: 1,
                duration: 600,
                delay: delay,
                useNativeDriver: true,
              }),
              Animated.timing(dotAnim, {
                toValue: 0.3,
                duration: 600,
                useNativeDriver: true,
              }),
            ])
          );
        };

        Animated.parallel([
          createDotAnimation(dot1Anim, 0),
          createDotAnimation(dot2Anim, 200),
          createDotAnimation(dot3Anim, 400),
        ]).start();
      };

      animateDots();

      // Hide welcome screen after 3 seconds
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => {
          setShowWelcome(false);
          setShowMenu(true);
        });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [showWelcome]);

  const generateId = () => {
    return Date.now().toString();
  };

  const handleSaveDrill = () => {
    if (!newDrill.title.trim() || !newDrill.category.trim() || !newDrill.description.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const customDrill: Drill = {
      id: generateId(),
      title: newDrill.title.trim(),
      category: newDrill.category.trim(),
      description: newDrill.description.trim(),
      isCustom: true
    };

    setDrills([...drills, customDrill]);
    setNewDrill({ title: '', category: '', description: '' });
    setShowAddForm(false);
    Alert.alert('Success', 'Custom drill added successfully!');
  };

  const handleCancel = () => {
    setNewDrill({ title: '', category: '', description: '' });
    setShowAddForm(false);
  };

  const toggleDrillSelection = (drillId: string) => {
    const newSelected = new Set(selectedDrills);
    if (newSelected.has(drillId)) {
      // Remove from selection
      newSelected.delete(drillId);
      setSelectedDrillsOrder(prev => prev.filter(id => id !== drillId));
    } else {
      // Add to selection and track order
      newSelected.add(drillId);
      setSelectedDrillsOrder(prev => [...prev, drillId]);
    }
    setSelectedDrills(newSelected);
  };

  const handleCreatePracticePlan = () => {
    if (!newPlanName.trim()) {
      Alert.alert('Error', 'Please enter a practice plan name');
      return;
    }

    if (selectedDrills.size === 0) {
      Alert.alert('Error', 'Please select at least one drill');
      return;
    }

    // Get drills in the order they were selected
    const selectedDrillObjects = selectedDrillsOrder
      .map(drillId => drills.find(drill => drill.id === drillId))
      .filter(drill => drill !== undefined) as Drill[];
    
    const newPlan: PracticePlan = {
      id: generateId(),
      name: newPlanName.trim(),
      drills: selectedDrillObjects,
      notes: '',
      createdAt: new Date()
    };

    setPracticePlans([...practicePlans, newPlan]);
    setSelectedDrills(new Set());
    setSelectedDrillsOrder([]);
    setNewPlanName('');
    setShowCreatePlan(false);
    Alert.alert('Success', 'Practice plan created successfully!');
  };

  const handleCancelPlan = () => {
    setNewPlanName('');
    setSelectedDrills(new Set());
    setSelectedDrillsOrder([]);
    setShowCreatePlan(false);
  };

  const handleDeletePlan = (planId: string) => {
    Alert.alert(
      'Delete Practice Plan',
      'Are you sure you want to delete this practice plan? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setPracticePlans(prev => prev.filter(plan => plan.id !== planId));
            Alert.alert('Success', 'Practice plan deleted successfully!');
          },
        },
      ]
    );
  };

  const handleEditPlan = (plan: PracticePlan) => {
    setEditingPlanId(plan.id);
    setEditingDrills([...plan.drills]);
  };

  const handleCancelEdit = () => {
    setEditingPlanId(null);
    setEditingDrills([]);
  };

  const handleSaveEdit = () => {
    if (editingPlanId) {
      setPracticePlans(prev => 
        prev.map(plan => 
          plan.id === editingPlanId 
            ? { ...plan, drills: editingDrills }
            : plan
        )
      );
      setEditingPlanId(null);
      setEditingDrills([]);
      Alert.alert('Success', 'Practice plan updated successfully!');
    }
  };

  const moveDrillUp = (index: number) => {
    if (index > 0) {
      const newDrills = [...editingDrills];
      [newDrills[index - 1], newDrills[index]] = [newDrills[index], newDrills[index - 1]];
      setEditingDrills(newDrills);
    }
  };

  const moveDrillDown = (index: number) => {
    if (index < editingDrills.length - 1) {
      const newDrills = [...editingDrills];
      [newDrills[index], newDrills[index + 1]] = [newDrills[index + 1], newDrills[index]];
      setEditingDrills(newDrills);
    }
  };

  const handleEditNotes = (plan: PracticePlan) => {
    setShowNotesEdit(plan.id);
    setEditingNotes(plan.notes);
  };

  const handleSaveNotes = (planId: string) => {
    setPracticePlans(prev => 
      prev.map(plan => 
        plan.id === planId 
          ? { ...plan, notes: editingNotes }
          : plan
      )
    );
    setShowNotesEdit(null);
    setEditingNotes('');
    Alert.alert('Success', 'Notes updated successfully!');
  };

  const handleCancelNotesEdit = () => {
    setShowNotesEdit(null);
    setEditingNotes('');
  };

  const handleViewPlan = (plan: PracticePlan) => {
    setSelectedPlan(plan);
    setShowPlanDetails(true);
  };

  const handleBackToPlans = () => {
    setShowPlanDetails(false);
    setSelectedPlan(null);
    setEditingNotesInDetail(false);
    setEditingNotes('');
  };

  const handleEditNotesInDetail = () => {
    if (selectedPlan) {
      setEditingNotesInDetail(true);
      setEditingNotes(selectedPlan.notes);
    }
  };

  const handleSaveNotesInDetail = () => {
    if (selectedPlan) {
      setPracticePlans(prev => 
        prev.map(plan => 
          plan.id === selectedPlan.id 
            ? { ...plan, notes: editingNotes }
            : plan
        )
      );
      setSelectedPlan(prev => prev ? { ...prev, notes: editingNotes } : null);
      setEditingNotesInDetail(false);
      setEditingNotes('');
      Alert.alert('Success', 'Notes updated successfully!');
    }
  };

  const handleCancelNotesInDetail = () => {
    setEditingNotesInDetail(false);
    setEditingNotes('');
  };

  const renderDrillItem = (drill: Drill) => {
    const isSelected = selectedDrills.has(drill.id);
    return (
      <TouchableOpacity 
        key={drill.id} 
        style={[
          styles.drillCard, 
          drill.isCustom && styles.customDrillCard,
          isSelected && styles.selectedDrillCard
        ]}
        onPress={() => toggleDrillSelection(drill.id)}
      >
        <View style={styles.drillHeader}>
          <View style={styles.drillContent}>
            <Text style={styles.drillTitle}>{drill.title}</Text>
            <Text style={styles.drillCategory}>{drill.category}</Text>
            <Text style={styles.drillDescription}>{drill.description}</Text>
          </View>
          <View style={styles.drillBadges}>
            {drill.isCustom && (
              <View style={styles.customBadge}>
                <Text style={styles.customBadgeText}>Custom</Text>
              </View>
            )}
            {isSelected && (
              <View style={styles.selectedBadge}>
                <Text style={styles.selectedBadgeText}>✓</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEditableDrillItem = (drill: Drill, index: number) => {
    return (
      <View key={drill.id} style={styles.editableDrillItem}>
        <View style={styles.drillOrderControls}>
          <TouchableOpacity
            style={[
              styles.orderButton,
              index === 0 && styles.disabledButton
            ]}
            onPress={() => moveDrillUp(index)}
            disabled={index === 0}
          >
            <Text style={[
              styles.orderButtonText,
              index === 0 && styles.disabledButtonText
            ]}>↑</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.orderButton,
              index === editingDrills.length - 1 && styles.disabledButton
            ]}
            onPress={() => moveDrillDown(index)}
            disabled={index === editingDrills.length - 1}
          >
            <Text style={[
              styles.orderButtonText,
              index === editingDrills.length - 1 && styles.disabledButtonText
            ]}>↓</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.editableDrillText}>
          {index + 1}. {drill.title}
        </Text>
      </View>
    );
  };

  const renderAddForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.formTitle}>Add Custom Drill</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Drill Title"
        value={newDrill.title}
        onChangeText={(text: string) => setNewDrill({ ...newDrill, title: text })}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Category (e.g., Hitting, Fielding, Pitching)"
        value={newDrill.category}
        onChangeText={(text: string) => setNewDrill({ ...newDrill, category: text })}
      />
      
      <TextInput
        style={[styles.input, styles.descriptionInput]}
        placeholder="Description"
        value={newDrill.description}
        onChangeText={(text: string) => setNewDrill({ ...newDrill, description: text })}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSaveDrill}>
          <Text style={styles.saveButtonText}>Save Drill</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCreatePlanForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.formTitle}>Create Practice Plan</Text>
      <Text style={styles.selectedCount}>
        {selectedDrills.size} drill{selectedDrills.size !== 1 ? 's' : ''} selected
      </Text>
      
      <TextInput
        style={styles.input}
        placeholder="Practice Plan Name"
        value={newPlanName}
        onChangeText={(text: string) => setNewPlanName(text)}
      />
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCancelPlan}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleCreatePracticePlan}>
          <Text style={styles.saveButtonText}>Create Plan</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPlanDetails = () => {
    if (!selectedPlan) return null;

    return (
      <View style={[styles.container, { paddingTop: statusBarHeight, paddingBottom: bottomPadding }]}>
        <StatusBar style="auto" />
        
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackToPlans}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{selectedPlan.name}</Text>
            <Text style={styles.drillCount}>
              {selectedPlan.drills.length} drills
            </Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.planDetailsContainer} showsVerticalScrollIndicator={false}>
          {/* Plan Info */}
          <View style={styles.planInfoCard}>
            <Text style={styles.planInfoTitle}>Practice Plan Details</Text>
            <Text style={styles.planInfoText}>
              Created: {selectedPlan.createdAt.toLocaleDateString()}
            </Text>
            <Text style={styles.planInfoText}>
              Total Drills: {selectedPlan.drills.length}
            </Text>
          </View>

          {/* All Drills */}
          <View style={styles.drillsSection}>
            <Text style={styles.sectionTitle}>Drill Sequence</Text>
            {selectedPlan.drills.map((drill, index) => (
              <View key={drill.id} style={styles.detailDrillCard}>
                <View style={styles.drillNumber}>
                  <Text style={styles.drillNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.drillContent}>
                  <Text style={styles.detailDrillTitle}>{drill.title}</Text>
                  <Text style={styles.detailDrillCategory}>{drill.category}</Text>
                  <Text style={styles.detailDrillDescription}>{drill.description}</Text>
                  {drill.isCustom && (
                    <View style={styles.customBadge}>
                      <Text style={styles.customBadgeText}>Custom</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* Notes Section */}
          <View style={styles.notesSection}>
            <View style={styles.notesHeader}>
              <Text style={styles.sectionTitle}>Practice Notes</Text>
              {!editingNotesInDetail && (
                <TouchableOpacity
                  style={styles.editNotesButton}
                  onPress={handleEditNotesInDetail}
                >
                  <Text style={styles.editNotesButtonText}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {editingNotesInDetail ? (
              // Edit mode
              <>
                <TextInput
                  style={styles.notesInput}
                  value={editingNotes}
                  onChangeText={setEditingNotes}
                  placeholder="Add your coaching notes here..."
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <View style={styles.notesEditActions}>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSaveNotesInDetail}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelEditButton}
                    onPress={handleCancelNotesInDetail}
                  >
                    <Text style={styles.cancelEditButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              // Display mode
              <TouchableOpacity
                style={styles.notesCard}
                onPress={handleEditNotesInDetail}
              >
                {selectedPlan.notes ? (
                  <Text style={styles.notesText}>{selectedPlan.notes}</Text>
                ) : (
                  <Text style={styles.notesPlaceholder}>Tap to add notes...</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderPracticePlans = () => (
    <View style={styles.practicePlansContainer}>
      <ScrollView style={styles.practicePlansList} showsVerticalScrollIndicator={false}>
        {practicePlans.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No practice plans created yet</Text>
            <Text style={styles.emptyStateSubtext}>Select drills and create your first practice plan!</Text>
          </View>
        ) : (
          practicePlans.map((plan) => {
            const isEditing = editingPlanId === plan.id;
            const isEditingNotes = showNotesEdit === plan.id;
            const drillsToShow = isEditing ? editingDrills : plan.drills;
            
            return (
              <View key={plan.id} style={styles.planCard}>
                <View style={styles.planHeader}>
                  <View style={styles.planInfo}>
                    <Text style={styles.planTitle}>{plan.name}</Text>
                    <Text style={styles.planDrillCount}>{plan.drills.length} drills</Text>
                    <Text style={styles.planDate}>
                      Created: {plan.createdAt.toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.planActions}>
                    {!isEditing && !isEditingNotes ? (
                      <>
                        <TouchableOpacity
                          style={styles.viewButton}
                          onPress={() => handleViewPlan(plan)}
                        >
                          <Text style={styles.viewButtonText}>👁️</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.notesButton}
                          onPress={() => handleEditNotes(plan)}
                        >
                          <Text style={styles.notesButtonText}>📝</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() => handleEditPlan(plan)}
                        >
                          <Text style={styles.editButtonText}>✏️</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDeletePlan(plan.id)}
                        >
                          <Text style={styles.deleteButtonText}>🗑️</Text>
                        </TouchableOpacity>
                      </>
                    ) : isEditingNotes ? (
                      <View style={styles.editActions}>
                        <TouchableOpacity
                          style={styles.saveButton}
                          onPress={() => handleSaveNotes(plan.id)}
                        >
                          <Text style={styles.saveButtonText}>Save</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.cancelEditButton}
                          onPress={handleCancelNotesEdit}
                        >
                          <Text style={styles.cancelEditButtonText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.editActions}>
                        <TouchableOpacity
                          style={styles.saveButton}
                          onPress={handleSaveEdit}
                        >
                          <Text style={styles.saveButtonText}>Save</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.cancelEditButton}
                          onPress={handleCancelEdit}
                        >
                          <Text style={styles.cancelEditButtonText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
                
                <View style={styles.planDrills}>
                  {isEditing ? (
                    // Edit mode: show all drills with up/down arrows
                    <>
                      <Text style={styles.editInstructions}>
                        Use arrows to reorder drills
                      </Text>
                      {drillsToShow.map((drill, index) => 
                        renderEditableDrillItem(drill, index)
                      )}
                    </>
                  ) : (
                    // Normal mode: show first 3 drills
                    <>
                      {plan.drills.slice(0, 3).map((drill) => (
                        <Text key={drill.id} style={styles.planDrillItem}>• {drill.title}</Text>
                      ))}
                      {plan.drills.length > 3 && (
                        <Text style={styles.planDrillItem}>... and {plan.drills.length - 3} more</Text>
                      )}
                    </>
                  )}
                </View>

                {/* Notes Section */}
                <View style={styles.notesSection}>
                  {isEditingNotes ? (
                    // Notes edit mode
                    <>
                      <Text style={styles.notesLabel}>Practice Notes:</Text>
                      <TextInput
                        style={styles.notesInput}
                        value={editingNotes}
                        onChangeText={setEditingNotes}
                        placeholder="Add your coaching notes here..."
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                      />
                    </>
                  ) : (
                    // Notes display mode - clickable
                    <>
                      <Text style={styles.notesLabel}>Practice Notes:</Text>
                      <TouchableOpacity
                        style={styles.notesDisplayContainer}
                        onPress={() => handleEditNotes(plan)}
                      >
                        {plan.notes ? (
                          <Text style={styles.notesText}>{plan.notes}</Text>
                        ) : (
                          <Text style={styles.notesPlaceholder}>Tap to add notes...</Text>
                        )}
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );

  // Welcome Screen Component
  const renderWelcomeScreen = () => (
    <View style={[styles.welcomeContainer, { paddingTop: statusBarHeight, paddingBottom: bottomPadding }]}>
      <StatusBar style="light" />
      <Animated.View 
        style={[
          styles.welcomeContent,
          {
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: slideAnim }
            ]
          }
        ]}
      >
        {/* Baseball Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.baseball}>
            <Text style={styles.baseballEmoji}>⚾</Text>
          </View>
          <View style={styles.logoText}>
            <Text style={styles.appTitle}>Dugout</Text>
            <Text style={styles.appSubtitle}>Planner</Text>
          </View>
        </View>
        
        {/* Tagline */}
        <Animated.View style={[styles.taglineContainer, { opacity: fadeAnim }]}>
          <Text style={styles.tagline}>Plan • Practice • Play</Text>
          <Text style={styles.taglineSub}>Your Ultimate Baseball Practice Companion</Text>
        </Animated.View>
        
        {/* Credit */}
        <Animated.View style={[styles.creditContainer, { opacity: fadeAnim }]}>
          <Text style={styles.creditText}>by EI-AI</Text>
        </Animated.View>
        
        {/* Loading indicator */}
        <Animated.View style={[styles.loadingContainer, { opacity: fadeAnim }]}>
          <View style={styles.loadingDots}>
            <Animated.View style={[styles.dot, { opacity: dot1Anim }]} />
            <Animated.View style={[styles.dot, { opacity: dot2Anim }]} />
            <Animated.View style={[styles.dot, { opacity: dot3Anim }]} />
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );

  // Menu Screen Component
  const renderMenuScreen = () => (
    <View style={[styles.menuContainer, { paddingTop: statusBarHeight, paddingBottom: bottomPadding }]}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.menuHeader}>
        <Text style={styles.menuTitle}>Dugout Planner</Text>
        <Text style={styles.menuSubtitle}>Choose your activity</Text>
      </View>

      {/* Menu Options */}
      <View style={styles.menuOptions}>
        {/* Practice Planning Option */}
        <TouchableOpacity 
          style={styles.menuOption}
          onPress={() => {
            setShowMenu(false);
            setShowPracticePlanning(true);
          }}
        >
          <View style={styles.menuOptionIcon}>
            <Text style={styles.menuIcon}>📋</Text>
          </View>
          <View style={styles.menuOptionContent}>
            <Text style={styles.menuOptionTitle}>Practice Planning</Text>
            <Text style={styles.menuOptionDescription}>
              Create practice plans, select drills, and organize your training sessions
            </Text>
          </View>
          <View style={styles.menuOptionArrow}>
            <Text style={styles.arrowText}>→</Text>
          </View>
        </TouchableOpacity>

        {/* Field Function Option */}
        <TouchableOpacity 
          style={styles.menuOption}
          onPress={() => {
            setShowMenu(false);
            setShowFieldDiagram(true);
          }}
        >
          <View style={styles.menuOptionIcon}>
            <Text style={styles.menuIcon}>⚾</Text>
          </View>
          <View style={styles.menuOptionContent}>
            <Text style={styles.menuOptionTitle}>Field Diagram</Text>
            <Text style={styles.menuOptionDescription}>
              Interactive baseball field with player positioning and defensive scenarios
            </Text>
          </View>
          <View style={styles.menuOptionArrow}>
            <Text style={styles.arrowText}>→</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.menuFooter}>
        <Text style={styles.menuFooterText}>by EI-AI</Text>
      </View>
    </View>
  );

  if (showWelcome) {
    return renderWelcomeScreen();
  }

  if (showMenu) {
    return renderMenuScreen();
  }

  if (showFieldDiagram) {
    return <BaseballField onBack={() => {
      setShowFieldDiagram(false);
      setShowMenu(true);
    }} />;
  }

  // Practice Planning Screen
  if (showPracticePlanning) {
    return (
      <View style={[styles.container, { paddingTop: statusBarHeight, paddingBottom: bottomPadding }]}>
        <StatusBar style="auto" />
        
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              setShowPracticePlanning(false);
              setShowMenu(true);
            }}
          >
            <Text style={styles.backButtonText}>← Menu</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
              {showPracticePlans ? 'Practice Plans' : 'Baseball Drills'}
            </Text>
            <Text style={styles.drillCount}>
              {showPracticePlans ? `${practicePlans.length} plans` : `${drills.length} drills`}
            </Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.navigation}>
        <TouchableOpacity 
          style={[styles.navButton, !showPracticePlans && styles.activeNavButton]}
          onPress={() => setShowPracticePlans(false)}
        >
          <Text style={[styles.navButtonText, !showPracticePlans && styles.activeNavButtonText]}>
            Drills
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.navButton, showPracticePlans && styles.activeNavButton]}
          onPress={() => setShowPracticePlans(true)}
        >
          <Text style={[styles.navButtonText, showPracticePlans && styles.activeNavButtonText]}>
            Practice Plans
          </Text>
        </TouchableOpacity>
      </View>

      {showPlanDetails ? (
        renderPlanDetails()
      ) : showPracticePlans ? (
        renderPracticePlans()
      ) : showAddForm ? (
        renderAddForm()
      ) : showCreatePlan ? (
        renderCreatePlanForm()
      ) : (
        <>
          <ScrollView style={styles.drillsList} showsVerticalScrollIndicator={false}>
            {drills.map(renderDrillItem)}
          </ScrollView>
          
          <View style={styles.bottomButtons}>
            {selectedDrills.size > 0 && (
              <TouchableOpacity 
                style={styles.createPlanButton} 
                onPress={() => setShowCreatePlan(true)}
              >
                <Text style={styles.createPlanButtonText}>
                  Create Plan ({selectedDrills.size})
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.addButton} 
              onPress={() => setShowAddForm(true)}
            >
              <Text style={styles.addButtonText}>+ Add Custom Drill</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
      </View>
    );
  }
  

  // This should not be reached in normal flow
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2c3e50',
    padding: 20,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  drillCount: {
    fontSize: 14,
    color: '#bdc3c7',
    textAlign: 'center',
    marginTop: 5,
  },
  fieldButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  fieldButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  drillsList: {
    flex: 1,
    padding: 15,
  },
  drillCard: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
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
  customDrillCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  drillTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  drillCategory: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  drillDescription: {
    fontSize: 14,
    color: '#34495e',
    lineHeight: 20,
  },
  customBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#3498db',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  customBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#27ae60',
    margin: 15,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  descriptionInput: {
    height: 100,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
  },
  saveButton: {
    backgroundColor: '#27ae60',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  navigation: {
    flexDirection: 'row',
    backgroundColor: '#34495e',
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 8,
    padding: 4,
  },
  navButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeNavButton: {
    backgroundColor: '#3498db',
  },
  navButtonText: {
    color: '#bdc3c7',
    fontSize: 16,
    fontWeight: '600',
  },
  activeNavButtonText: {
    color: 'white',
  },
  drillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  drillContent: {
    flex: 1,
    marginRight: 10,
  },
  drillBadges: {
    alignItems: 'flex-end',
  },
  selectedDrillCard: {
    borderColor: '#27ae60',
    borderWidth: 2,
  },
  selectedBadge: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 5,
  },
  selectedBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bottomButtons: {
    padding: 15,
  },
  createPlanButton: {
    backgroundColor: '#e74c3c',
    marginBottom: 10,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createPlanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  selectedCount: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 15,
  },
  practicePlansContainer: {
    flex: 1,
  },
  practicePlansList: {
    flex: 1,
    padding: 15,
  },
  planCard: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
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
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  planInfo: {
    flex: 1,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  planDrillCount: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 5,
  },
  planDate: {
    fontSize: 12,
    color: '#95a5a6',
  },
  planActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#9b59b6',
    marginRight: 8,
  },
  viewButtonText: {
    fontSize: 16,
  },
  notesButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f39c12',
    marginRight: 8,
  },
  notesButtonText: {
    fontSize: 16,
  },
  editButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#3498db',
    marginRight: 8,
  },
  editButtonText: {
    fontSize: 16,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#e74c3c',
  },
  deleteButtonText: {
    fontSize: 16,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#27ae60',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cancelEditButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#95a5a6',
  },
  cancelEditButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  editInstructions: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  editableDrillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  drillOrderControls: {
    flexDirection: 'column',
    marginRight: 12,
  },
  orderButton: {
    width: 24,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 1,
  },
  disabledButton: {
    backgroundColor: '#bdc3c7',
  },
  orderButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  disabledButtonText: {
    color: '#7f8c8d',
  },
  editableDrillText: {
    flex: 1,
    fontSize: 14,
    color: '#34495e',
    fontWeight: '500',
  },
  notesSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  notesDisplayContainer: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  notesText: {
    fontSize: 13,
    color: '#34495e',
    lineHeight: 18,
  },
  notesPlaceholder: {
    fontSize: 13,
    color: '#95a5a6',
    fontStyle: 'italic',
  },
  notesInput: {
    fontSize: 13,
    color: '#34495e',
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  // Plan Details Screen Styles
  planDetailsContainer: {
    flex: 1,
    padding: 15,
  },
  planInfoCard: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15,
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
  planInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  planInfoText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 5,
  },
  drillsSection: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  detailDrillCard: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  drillNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  drillNumberText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  detailDrillTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  detailDrillCategory: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  detailDrillDescription: {
    fontSize: 14,
    color: '#34495e',
    lineHeight: 20,
  },
  notesCard: {
    backgroundColor: 'white',
    padding: 15,
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
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  editNotesButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#3498db',
    borderRadius: 4,
  },
  editNotesButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  notesEditActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 10,
  },
  planDrills: {
    marginTop: 5,
  },
  planDrillItem: {
    fontSize: 12,
    color: '#34495e',
    marginBottom: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
  },
  // Welcome Screen Styles
  welcomeContainer: {
    flex: 1,
    backgroundColor: '#1a252f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  baseball: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 15,
  },
  baseballEmoji: {
    fontSize: 60,
  },
  logoText: {
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 2,
  },
  appSubtitle: {
    fontSize: 24,
    fontWeight: '300',
    color: '#3498db',
    textAlign: 'center',
    letterSpacing: 1,
    marginTop: -5,
  },
  taglineContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  tagline: {
    fontSize: 18,
    color: '#ecf0f1',
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
  },
  taglineSub: {
    fontSize: 14,
    color: '#bdc3c7',
    textAlign: 'center',
    fontWeight: '300',
  },
  creditContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  creditText: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    fontWeight: '400',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3498db',
    marginHorizontal: 4,
  },
  // Menu Screen Styles
  menuContainer: {
    flex: 1,
    backgroundColor: '#1a252f',
  },
  menuHeader: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  menuTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  menuSubtitle: {
    fontSize: 16,
    color: '#bdc3c7',
    textAlign: 'center',
  },
  menuOptions: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  menuOption: {
    backgroundColor: '#2c3e50',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuOptionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuIcon: {
    fontSize: 28,
  },
  menuOptionContent: {
    flex: 1,
  },
  menuOptionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  menuOptionDescription: {
    fontSize: 14,
    color: '#bdc3c7',
    lineHeight: 20,
  },
  menuOptionArrow: {
    marginLeft: 10,
  },
  arrowText: {
    fontSize: 24,
    color: '#3498db',
    fontWeight: 'bold',
  },
  menuFooter: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  menuFooterText: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  // Updated header styles for practice planning
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    width: 60, // Same width as back button for balance
  },
  backButton: {
    padding: 8,
    width: 60,
  },
  backButtonText: {
    color: '#3498db',
    fontSize: 16,
    fontWeight: '600',
  },
});
