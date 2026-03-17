import Float "mo:core/Float";
import Int "mo:core/Int";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import List "mo:core/List";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";

actor {
  // Initialize the access control system
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User Profile Type
  public type UserProfile = {
    name : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  // User Profile Functions
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    userProfiles.add(caller, profile);
  };

  // Bill Data Types
  type Bill = {
    id : Nat;
    block : Text;
    panchayat : Text;
    customerName : Text;
    billNo : Text;
    billDate : Text;
    workCode : Text;
    paymentDate : Text;
    prsName : Text;
    mobile : Text;
    itemsJson : Text;
    total : Float;
    timestamp : Int;
  };

  // Use persistent Map data structure
  let bills = Map.empty<Nat, Bill>();

  // Persistently store the current_id
  var currentId = 0;

  // Add new bill
  public shared func addBill(
    block : Text,
    panchayat : Text,
    customerName : Text,
    billNo : Text,
    billDate : Text,
    workCode : Text,
    paymentDate : Text,
    prsName : Text,
    mobile : Text,
    itemsJson : Text,
    total : Float,
  ) : async {
    id : Nat;
  } {
    let id = currentId;
    currentId += 1;

    let bill : Bill = {
      id;
      block;
      panchayat;
      customerName;
      billNo;
      billDate;
      workCode;
      paymentDate;
      prsName;
      mobile;
      itemsJson;
      total;
      timestamp = 0;
    };

    bills.add(id, bill);
    { id };
  };

  // Get all bills
  public query func getAllBills() : async [Bill] {
    bills.values().toArray();
  };

  // Update bill
  public shared func updateBill(
    id : Nat,
    block : Text,
    panchayat : Text,
    customerName : Text,
    billNo : Text,
    billDate : Text,
    workCode : Text,
    paymentDate : Text,
    prsName : Text,
    mobile : Text,
    itemsJson : Text,
    total : Float,
    timestamp : Int,
  ) : async {
    id : Nat;
  } {
    let existingBill = switch (bills.get(id)) {
      case (null) { Runtime.trap("Bill with id " # id.toText() # " does not exist") };
      case (?bill) { bill };
    };
    ignore existingBill;

    let updatedBill : Bill = {
      id;
      block;
      panchayat;
      customerName;
      billNo;
      billDate;
      workCode;
      paymentDate;
      prsName;
      mobile;
      itemsJson;
      total;
      timestamp;
    };

    bills.add(id, updatedBill);
    { id };
  };

  // Delete bill
  public shared func deleteBill(id : Nat) : async () {
    if (not bills.containsKey(id)) {
      Runtime.trap("Bill with id " # id.toText() # " does not exist");
    };
    bills.remove(id);
  };
};
