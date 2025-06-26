//BEGIN LICENSE BLOCK 
//Interneuron Terminus

//Copyright(C) 2025  Interneuron Limited

//This program is free software: you can redistribute it and/or modify
//it under the terms of the GNU General Public License as published by
//the Free Software Foundation, either version 3 of the License, or
//(at your option) any later version.

//This program is distributed in the hope that it will be useful,
//but WITHOUT ANY WARRANTY; without even the implied warranty of
//MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

//See the
//GNU General Public License for more details.

//You should have received a copy of the GNU General Public License
//along with this program.If not, see<http://www.gnu.org/licenses/>.
//END LICENSE BLOCK 
import { ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { ApirequestService } from './services/apirequest.service';
import { AppService } from './services/app.service';
import { SubjectsService } from './services/subjects.service';
import { Prescription, PrescriptionMedicaitonSupply } from "src/app/models/EPMA"
import { filter, filterparam, filterParams, filters, orderbystatement, selectstatement, action, DataContract } from './models/filter.model';
import moment from 'moment';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { modules, popovers, PrescriptionContext } from './services/enum';
import { DataRequest } from './services/datarequest';

import { v4 as uuid } from 'uuid';
import { TemplateNumberComponent } from './components/template-number/template-number.component';



@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnDestroy {
  title = 'terminus-module-epma';
  noEncountersAvailable = false;
  datePicker: boolean = false;
  startDate;
  endDate;
  numberOfEmptyTemplates: number;
  showPopOver: popovers = popovers.none;
  showTitrationChart: popovers = popovers.none;
  showChoosedate = false;

  browserName: string;
  browserVersion: any;
  browserVersionSupported: any;
  browserVersionError = false;
  conflictuserid = "";
  showPopOverPatientDrug: popovers;
  showAdustInfusion: popovers = popovers.none;



  @Input() set datacontract(value: DataContract) {
    this.appService.personId = value.personId;
    this.appService.apiService = value.apiService;
    this.subjects.unload = value.unload;
    this.initConfigAndGetMeta(this.appService.apiService);
    this.showPrintIcon = false;
    if (value.moduleAction)
      this.subscriptions.add(value.moduleAction.subscribe((e) => {
      }));
    if (value.additionalInfo) {
      let terminusmodule = value.additionalInfo.find(x => x.key == "currentmodule");
      if (terminusmodule)
        this.appService.currentTerminusModle = terminusmodule.value;
    }
  }

  @Output() frameworkAction = new EventEmitter<string>();

  subscriptions: Subscription = new Subscription();
  loadDrugChart: number = 0;
  currentmodule: modules = modules["app-drug-chart"];
  editingPrescription: Prescription;
  clonePrescription: boolean = false;
  cloningExternally: boolean = false;;

  bsModalRef: BsModalRef;
  groupFilterType: string = "Basic";
  showdrugChart: boolean = false;
  showPrescribingForm = false;
  totalmetadatarequests = 15;
  Showtherapies = "Active";
  Sorttherapie = "DESCRIPTION-ASC";
  FilterRoutesby = "All routes";
  medicationAdministrationEmptyTemplate: any = false;
  popover_prescriptioncontext: any;
  AllRoutes: string[] = [];
  isCalledOnce: boolean = false;
  showPrintIcon = false;
  printing = false;

  basicgrouping = ['Stat', 'VTE', 'Antimicrobials', 'Diabetics', 'Variable/Continuous infusion', 'PRN', 'IV Fluid', 'Regular drugs']

  @ViewChild('open_refreshmessage') open_refreshmessage: ElementRef;
  @ViewChild('close_pform') close_pform: ElementRef;

  isLoading = false;
  showChart = false;



  constructor(private subjects: SubjectsService,
    public appService: AppService,
    private apiRequest: ApirequestService,
    private modalService: BsModalService,
    private cd: ChangeDetectorRef,
    private dr: DataRequest) {


  }

  generateChart() {
    this.appService.reset();
    this.showChart = false;
    this.cd.detectChanges();
    this.showChart = true;
    this.cd.detectChanges();
    this.InitApp()
  }


  ngOnDestroy() {
    this.appService.logToConsole("app component being unloaded");
    if (this.appService.warningService) {
      this.appService.warningService.contexts.forEach(w => {
        w.resetWarningService();
      });
    }
    this.appService.encounter = null;
    this.appService.personId = null;
    this.appService.isCurrentEncouner = null;
    this.appService.reset();
    this.subscriptions.unsubscribe();
    this.dr.ngOnDestroy();

    this.appService.warningService = null;
    this.appService = null;

    this.subjects.unload.next("app-epma");
  }



  InitApp() {
    let encounter;
    let input = <HTMLInputElement>document.getElementById("encounter_input");
    if (input)
      encounter = JSON.parse(input.value)

    this.appService.encounter = encounter
    this.appService.personId = encounter.person_id;
    this.appService.encounter = encounter;
    this.appService.lenghOfStay = this.appService.GetDurationBetweenDates(this.appService.encounter.admitdatetime, moment())
    this.appService.personDOB = encounter.dateofbirth;

    let value: any = {};
    value.authService = {};
    value.authService.user = {};
    let auth = this.apiRequest.authService;
    auth.getToken().then((token) => {
      value.authService.user.access_token = token;
      this.initConfigAndGetMeta(value);
    });

  }

  initConfigAndGetMeta(value: any) {
    this.appService.apiService = value;
    this.dr.subscriptions = new Subscription();
    this.subscriptions.add(this.apiRequest.getRequest("./assets/config/EPMAConfig.json?V" + Math.random()).subscribe(
      (response) => {
        this.appService.appConfig = response;
        this.appService.baseURI = this.appService.appConfig.uris.baseuri;
        this.appService.enableLogging = this.appService.appConfig.enablelogging;
        this.browserVersionSupported = this.appService.appConfig.AppSettings.minSafariVersionSupported;
        this.appService.buffertimeAmber = this.appService.appConfig.bufferTime.buffertimeAmber;
        this.appService.criticalDrugbuffertimeAmber = this.appService.appConfig.bufferTime.buffertime_criticalDrug;
        this.appService.EnableDischargeSummaryComplete = this.appService.appConfig.EnableDischargeSummaryComplete;
        this.appService.bufferAdministered = this.appService.appConfig.bufferTime.bufferAdministered;
        this.appService.pleaseResupplyStockValidation = this.appService.appConfig.pleaseResupplyStockValidation;
        this.appService.isReasonForChangeReuired = this.appService.appConfig.isReasonForChangeReuired;
        this.appService.platfromServiceURI = this.appService.appConfig.uris.platformserviceuri;
        this.appService.DCGroups = this.appService.appConfig.AppSettings.DCGroups;
        this.appService.administrationTimeDiffInMinute = this.appService.appConfig.AppSettings.administrationTimeDiffInMinute;
        this.GetMetaData();
      }));
  }


  GetMetaData() {
    if (this.appService.apiService) {
      this.appService.loggedInUserName = "BCP.EPMA";

      this.dr.getAllPrescriptionMeta(() => {
        this.getPrescriptionsForCurrentEncounter();
        this.dr.getSupplyRequest(() => { });
        this.dr.GetMedicationSupply(() => { });
        this.dr.GetWitnesAuthentication(() => { });
        this.dr.GetPrescriptionEvent(() => { });
        this.dr.GetNursingInstruction(() => { });
      });
    }
  }

  public GetDataVersion(cb: () => any) {
    this.apiRequest.getRequest(`${this.appService.baseURI}/GetSynchronousPostVersionNumber/?personId=${this.appService.personId}&moduleName=${this.appService.modulename}`).subscribe(
      (response) => {
        this.appService.dataversion = response;
        console.log("DataVersion: " + response);
        cb();
      }
    )
  }

  getPrescriptionsForCurrentEncounter() {
    this.appService.Prescription = [];
    this.appService.FilteredPrescription = [];
    this.appService.TherapyPrescription = [];

    // let dataRequest = new DataRequest(this.apiRequest, this.appService);
    this.dr.getAllPrescription(() => {
      this.dr.getAdminstrations(() => {
        this.appService.Prescription.forEach(p => this.appService.UpdatePrescriptionCompletedStatus(p));
        this.dr.getReminders(() => {
          this.dr.getPharmacyReviewStatus(() => {
            this.appService.isAppDataReady = true;

            this.appService.Prescription.forEach(p => {
              var curTime = moment(moment(new Date()).toDate()).add(-5, "minutes").format("YYYYMMDDHHmm");
              if (!((p.prescriptionstatus_id == "f1e191f1-3985-4d2f-b96b-0b1b48fa7714" || p.prescriptionstatus_id == "5d78c6a6-2962-4dcd-8fd0-9824ef09135f") && moment(new Date(p.lastmodifiedon)).format("YYYYMMDDHHmm") < curTime)) {
                this.appService.FilteredPrescription.push(p);
              }
            });

            this.changeGroupType(this.groupFilterType);

          });
        });
      });
    });
  }


  changeGroupType(option: any) {
    this.showdrugChart = false;
    this.groupFilterType = option;

    let prescriptionroutes = [].concat(...this.appService.Prescription.map(p => p.__routes));
    // let prescriptionroutes = this.appService.Prescriptionroutes.filter(x => x.isdefault == true);
    this.appService.Choosenfilterdate = new Date();
    this.AllRoutes = prescriptionroutes.map(item => item.route)
      .filter((value, index, self) => self.indexOf(value) === index);

    if (option == "Basic") {

      this.appService.DrugeGroupsType = []
      this.appService.DrugeGroupsType = this.appService.appConfig.AppSettings.basicgrouping;

    }

    // else if (option == "custom group") {
    //   let primaryMedications = [].concat(...this.appService.Prescription.map(p => p.__medications)).filter(x => x.isprimary == true);
    //   this.appService.DrugeGroupsType = primaryMedications.map(item => item.customgroup)
    //     .filter((value, index, self) => self.indexOf(value) === index);

    // }
    else if (option == "Base") {
      if (this.appService.appConfig.AppSettings.UseStoredClassification) {
        let primaryMedications = [].concat(...this.appService.Prescription.map(p => p.__medications)).filter(x => x.isprimary == true);
        this.appService.DrugeGroupsType = primaryMedications.map(item => item.classification)
          .filter((value, index, self) => self.indexOf(value) === index);
      }
      else {
        let allprescriptionsfdbgroups = [].concat(...this.appService.Prescription.map(
          (p) => {
            if (!p.__drugcodes) {
              return [{ "additionalCodeSystem": "FDB", "additionalCodeDesc": null }]
            }
            else if (!p.__drugcodes.find(dc => dc.additionalCodeSystem == "FDB")) {
              return [{ "additionalCodeSystem": "FDB", "additionalCodeDesc": null }]
            }
            else {
              return p.__drugcodes;
            }
          })).filter(x => x.additionalCodeSystem == "FDB");
        this.appService.DrugeGroupsType = allprescriptionsfdbgroups.map(item => item.additionalCodeDesc)
          .filter((value, index, self) => self.indexOf(value) === index);
      }

      this.appService.DrugeGroupsType.sort();
    }
    else if (option == "Route") {

      this.appService.DrugeGroupsType = this.AllRoutes;
      this.appService.DrugeGroupsType.sort();
    }

    for (let i = 0; i < this.appService.DrugeGroupsType.length; i++) {
      if (this.appService.DrugeGroupsType[i] == null || this.appService.DrugeGroupsType[i].trim() == '') {
        this.appService.DrugeGroupsType[i] = "Others";
      }
      this.appService.DrugeGroupsType = this.appService.DrugeGroupsType.map(item => item)
        .filter((value, index, self) => self.indexOf(value) === index);

    }

    //this.sortPrescription(this.Sorttherapie);
    this.appService.drugGroupOption = option;
    this.cd.detectChanges();
    this.showdrugChart = true;
    this.filterDateAndRought(this.Showtherapies, this.FilterRoutesby);
    // setTimeout(x => this.showdrugChart = true);

  }

  chooseDateclick(parameter: boolean) {
    this.showdrugChart = false;
    this.appService.FilteredPrescription = [];
    this.showChoosedate = parameter;
    if (!this.showChoosedate) {
      this.appService.Choosenfilterdate = new Date();
      this.filterDateAndRought(this.Showtherapies, this.FilterRoutesby);
    }
    else if (this.showChoosedate) {
      let selectedDate = moment(this.appService.Choosenfilterdate);
      selectedDate.set({
        hour: 0,
        minute: 0,
        second: 0,
        millisecond: 0,
      });



      this.appService.changechoosenFilterDate = moment(selectedDate);
      for (let prescription of this.appService.Prescription) {
        let enddate = moment(this.appService.GetCurrentPosology(prescription).prescriptionenddate);
        //let preStart = moment(null ? prescription.startdatetime : this.appService.encounter.sortdate);
        let preStart = prescription.startdatetime == null ? moment(this.appService.encounter.sortdate) : moment(prescription.startdatetime)
        for (let poso of prescription.__posology) {

          if (moment(preStart).isSameOrAfter(moment(poso.prescriptionstartdate))) {
            preStart = moment(poso.prescriptionstartdate)
          }

        }
        if (prescription.prescriptionstatus_id == "f1e191f1-3985-4d2f-b96b-0b1b48fa7714" || prescription.prescriptionstatus_id == "5d78c6a6-2962-4dcd-8fd0-9824ef09135f") // if prestion is stop
        {
          if (moment(prescription.lastmodifiedon, "YYYY-MM-DD").isSameOrAfter(moment(selectedDate)))// and stop date is selected or greate
          {
            enddate = moment(selectedDate);
          }
          else {
            enddate = moment(prescription.lastmodifiedon);
          }
        }
        if (!enddate.isValid()) { // if enddate is null and not spot so end date is selected
          enddate = selectedDate;
        }
        if (moment(preStart, "YYYY-MM-DD").isSameOrBefore(selectedDate, 'day') || moment(selectedDate, "YYYY-MM-DD").isSame(moment(), 'day')) {
          if (this.Showtherapies == "Active") {
            var curTime = moment(moment(new Date()).toDate()).add(-5, "minutes").format("YYYYMMDDHHmm");
            if (!((prescription.prescriptionstatus_id == "f1e191f1-3985-4d2f-b96b-0b1b48fa7714" || prescription.prescriptionstatus_id == "5d78c6a6-2962-4dcd-8fd0-9824ef09135f") && moment(new Date(prescription.lastmodifiedon)).format("YYYYMMDDHHmm") < curTime)) {

              if (prescription.__completed != true) {
                this.appService.FilteredPrescription.push(<Prescription>prescription);
              }
              else if (moment(new Date(prescription.__completedOn)).format("YYYYMMDDHHmm") > curTime) {
                this.appService.FilteredPrescription.push(<Prescription>prescription);
              }
            }
          }
          else if (this.Showtherapies == "stoped") {

            let enddate = moment(this.appService.GetCurrentPosology(prescription).prescriptionenddate);
            if (!enddate.isValid()) {
              enddate = moment();
            }
            if (prescription.__completed == true) {
              this.appService.FilteredPrescription.push(<Prescription>prescription);
            }
            else if (prescription.prescriptionstatus_id != "5750c99f-75ec-4b33-b10c-782a000cc360" && prescription.prescriptionstatus_id != "fe406230-be68-4ad6-a979-ef15c42365cf" && prescription.prescriptionstatus_id != "fd8833de-213b-4570-8cc7-67babfa31393" && prescription.prescriptionstatus_id != "63e946cd-b4a4-4f60-9c18-a384c49486ea") {

              this.appService.FilteredPrescription.push(<Prescription>prescription);

            }

          }
          else if (this.Showtherapies == "ALL") {

            this.appService.FilteredPrescription.push(<Prescription>prescription);

          }

        }
      }

      this.sortPrescription(this.Sorttherapie);
      this.cd.detectChanges();
      this.showdrugChart = true;
    }
  }

  filterDateAndRought(therapietype: any, routerupe) {
    this.appService.changechoosenFilterDate = moment();
    this.Showtherapies = therapietype;
    this.FilterRoutesby = routerupe;
    this.showdrugChart = false;
    this.appService.FilteredPrescription = [];
    if (this.Showtherapies == "Active") {

      for (let prescription of this.appService.Prescription) {

        var curTime = moment(moment(new Date()).toDate()).add(-5, "minutes").format("YYYYMMDDHHmm");
        if (!((prescription.prescriptionstatus_id == "f1e191f1-3985-4d2f-b96b-0b1b48fa7714" || prescription.prescriptionstatus_id == "5d78c6a6-2962-4dcd-8fd0-9824ef09135f") && moment(new Date(prescription.lastmodifiedon)).format("YYYYMMDDHHmm") < curTime)) {
          if (prescription.__completed != true) {
            this.appService.FilteredPrescription.push(<Prescription>prescription);
          }
          else if (moment(new Date(prescription.__completedOn)).format("YYYYMMDDHHmm") > curTime) {
            this.appService.FilteredPrescription.push(<Prescription>prescription);
          }
        }
      }
    }
    else if (this.Showtherapies == "stoped") {

      // var lasttreeday = moment();
      // lasttreeday = moment().subtract(2, "days");
      // lasttreeday.set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
      for (let prescription of this.appService.Prescription) {
        let enddate = moment(this.appService.GetCurrentPosology(prescription).prescriptionenddate);
        if (!enddate.isValid()) {
          enddate = moment();
        }
        if (prescription.__completed == true) {
          this.appService.FilteredPrescription.push(<Prescription>prescription);
        }
        else if ((prescription.prescriptionstatus_id != "5750c99f-75ec-4b33-b10c-782a000cc360" && prescription.prescriptionstatus_id != "fe406230-be68-4ad6-a979-ef15c42365cf" && prescription.prescriptionstatus_id != "fd8833de-213b-4570-8cc7-67babfa31393" && prescription.prescriptionstatus_id != "63e946cd-b4a4-4f60-9c18-a384c49486ea")) {

          this.appService.FilteredPrescription.push(<Prescription>prescription);

        }
      }
    }
    else if (this.Showtherapies == "ALL") {
      for (let prescription of this.appService.Prescription) {

        this.appService.FilteredPrescription.push(<Prescription>prescription);

      }
    }

    else if (this.Showtherapies == "Choose date") {
      let selectedDate = moment(this.appService.Choosenfilterdate);
      selectedDate.set({
        hour: 0,
        minute: 0,
        second: 0,
        millisecond: 0,
      });
      this.appService.changechoosenFilterDate = moment(selectedDate);
      for (let prescription of this.appService.Prescription) {
        let enddate = moment(this.appService.GetCurrentPosology(prescription).prescriptionenddate);
        let preStart = moment(this.appService.GetCurrentPosology(prescription).prescriptionstartdate)

        if (prescription.prescriptionstatus_id == "f1e191f1-3985-4d2f-b96b-0b1b48fa7714" || prescription.prescriptionstatus_id == "5d78c6a6-2962-4dcd-8fd0-9824ef09135f") // if prestion is stop
        {
          if (moment(prescription.lastmodifiedon, "YYYY-MM-DD").isSameOrAfter(moment(selectedDate)))// and stop date is selected or greate
          {
            enddate = moment(selectedDate);
          }
          else {
            enddate = moment(prescription.lastmodifiedon);
          }
        }
        if (!enddate.isValid()) { // if enddate is null and not spot so end date is selected
          enddate = selectedDate;
        }

        if (moment(preStart, "YYYY-MM-DD").isSameOrBefore(selectedDate, 'day')) {

          this.appService.FilteredPrescription.push(<Prescription>prescription);

        }
      }
    }
    /// Rought filter
    if (this.FilterRoutesby != "All routes") {

      this.appService.FilteredPrescription = this.appService.FilteredPrescription.filter(x => x.__routes.length != 0);
      this.appService.FilteredPrescription = this.appService.FilteredPrescription.filter(x => x.__routes.find(d => d.isdefault == true).route == this.FilterRoutesby);

    }

    this.sortPrescription(this.Sorttherapie);
    this.cd.detectChanges();
    this.showdrugChart = true;

  }
  sortPrescription(sortby: any) {
    this.showdrugChart = false;
    this.Sorttherapie = sortby;
    if (this.Sorttherapie == "DESCRIPTION-ASC") {
      this.appService.FilteredPrescription.sort((a, b) => (a.__medications.find(x => x.isprimary).name > b.__medications.find(x => x.isprimary).name) ? 1 : ((b.__medications.find(x => x.isprimary).name > a.__medications.find(x => x.isprimary).name) ? -1 : 0));
    }
    else if (this.Sorttherapie == "DESCRIPTION-DESC") {
      this.appService.FilteredPrescription.sort((b, a) => (a.__medications.find(x => x.isprimary).name > b.__medications.find(x => x.isprimary).name) ? 1 : ((b.__medications.find(x => x.isprimary).name > a.__medications.find(x => x.isprimary).name) ? -1 : 0));
    }
    else if (this.Sorttherapie == "CREATED TIME-ASC") {
      this.appService.FilteredPrescription.sort((a, b) => (moment(this.appService.GetCurrentPosology(a).prescriptionstartdate) > moment(this.appService.GetCurrentPosology(b).prescriptionstartdate)) ? 1 : ((moment(this.appService.GetCurrentPosology(b).prescriptionstartdate) > moment(this.appService.GetCurrentPosology(a).prescriptionstartdate)) ? -1 : 0));
    }
    else if (this.Sorttherapie == "CREATED TIME-DESC") {

      this.appService.FilteredPrescription.sort((b, a) => (new Date(this.appService.GetCurrentPosology(a).prescriptionstartdate) > new Date(this.appService.GetCurrentPosology(b).prescriptionstartdate)) ? 1 : ((new Date(this.appService.GetCurrentPosology(b).prescriptionstartdate) > new Date(this.appService.GetCurrentPosology(a).prescriptionstartdate)) ? -1 : 0));
    }
    this.cd.detectChanges();
    this.showdrugChart = true;
    this.appService.drugRouteOption = this.FilterRoutesby;
    this.appService.drugSortOrder = this.Sorttherapie;
    this.subjects.therapyOverview.next(undefined);

  }

  changechoosendate(daynumber: any) {
    if (this.appService.Choosenfilterdate != null) {
      this.isCalledOnce = false;
      this.appService.Choosenfilterdate = new Date(Date.UTC(this.appService.Choosenfilterdate.getFullYear(), this.appService.Choosenfilterdate.getMonth(), this.appService.Choosenfilterdate.getDate() + daynumber));
      this.chooseDateclick(true)
    }



  }
  ChoosenfilterdateChange(value: Date): void {
    //  this.appService.Choosenfilterdate = moment(value,"DD/MM/YYYY");
    if (this.isCalledOnce && value != null) {
      this.isCalledOnce = true;
      !this.appService.chartScrolled && this.chooseDateclick(true)
      this.appService.chartScrolled = false;

    }
  }
  // Begin Therpay overview code
  setNoOfDaysTherapy(number) {
    this.appService.therapyCurrentDate = moment();
    this.appService.therapyNoOfDays = number;
    this.subjects.therapyOverview.next(undefined);
  }
  prevDaysTherapy() {
    if (this.appService.therapyNoOfDays == 3) {
      this.appService.therapyCurrentDate.add(-3, "days");
    } else {
      this.appService.therapyCurrentDate.add(-5, "days");
    }
    this.subjects.therapyOverview.next(undefined);
  }
  nextDaysTherapy() {
    if (this.appService.therapyNoOfDays == 3) {
      this.appService.therapyCurrentDate.add(3, "days");
    } else {
      this.appService.therapyCurrentDate.add(5, "days");
    }
    this.subjects.therapyOverview.next(undefined);
  }
  // End Therapy Overview

  onDatePickerClose(event) {
    this.isCalledOnce = true;
  }

  onDatePickerOpen(event) {
    this.isCalledOnce = true;
  }
  makeId(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  CheckBannerWarnings(): boolean {
    if (!this.appService.bannerWarningStatus) {
      this.subjects.showBannerWarnings.next(undefined);
      return false;
    }
    // else
    //   if (!this.appService.isWeightCapturedForToday) {
    //     this.openRecordWeightModal('D');
    // } 
    // else if (!this.appService.isHeightCaptured) {
    //   this.openRecordHeightModal('D');
    // }
    else {
      if (this.appService.refWeightValue && this.appService.refHeightValue) {
        this.appService.bodySurfaceArea = +(Math.sqrt(+this.appService.refWeightValue * +this.appService.refHeightValue) / 60).toFixed(2);
      }
    }
    return true;
  }








  destroyRecordsTemplate() {
    this.isLoading = false
    this.medicationAdministrationEmptyTemplate = false;
    this.startDate = '';
    this.endDate = '';
    this.numberOfEmptyTemplates = null;
    this.printing = false;
  }

  updateDates(event) {
    console.log(event);
    this.datePicker = false;
  }



  openActivePrintingTemplate() {
    this.isLoading = true;
    this.dr.getHeightWeight(() => {
      setTimeout(() => {
        this.medicationAdministrationEmptyTemplate = 'active'
      }, 100);
    });

  }

  openCurrentPrintingTemplate() {
    this.isLoading = true;
    this.dr.getHeightWeight(() => {
      setTimeout(() => {
        this.medicationAdministrationEmptyTemplate = 'current'
      }, 100);
    });
  }

  getPrescriptionNumber() {
    const config = {
      backdrop: true,
      ignoreBackdropClick: true,
      class: 'modal-dialog-centered modal-sm',

    };

    this.bsModalRef = this.modalService.show(TemplateNumberComponent, config);
    this.bsModalRef.content = {
      saveDone: (templateNumber) => {
        if (templateNumber) {
          this.isLoading = true;
          this.numberOfEmptyTemplates = templateNumber;
          this.dr.getHeightWeight(() => {
            setTimeout(() => {
              this.medicationAdministrationEmptyTemplate = 'empty';
            }, 100);
          });

        }
      },
      cancel: () => {
        this.printing = false;
      }

    };

  }

  openActive() {
    const config = {
      backdrop: true,
      ignoreBackdropClick: true,
      class: 'modal-dialog-centered modal-sm',
      initialState: {
        errorMessage: "",
        marType: "active"

      }
    };

    this.bsModalRef = this.modalService.show(TemplateNumberComponent, config);
    this.bsModalRef.content = {
      saveDone: (templateNumber) => {
        if (templateNumber) {
          this.numberOfEmptyTemplates = templateNumber;
          this.medicationAdministrationEmptyTemplate = 'active';
        }
      },
      cancel: () => {
        this.printing = false;
      }
    };

  }


  TriggerWarningUpdateCheck(cb: Function = null) {
    if (this.appService.warningService && this.appService.warningServiceIPContext.loader != true) {
      this.dr.TriggerWarningUpdateOnChanges(() => {
        if (this.appService.warningServiceIPContext.existingWarningsStatus == false) {
          this.subjects.showWarnings.next(undefined);
        }
        if (cb)
          cb();
      });
    }
  }

  BannerWarningsLoaded() {
    // if (this.appService.bannerWarningStatus == false) {
    //   this.subjects.showBannerWarnings.next(undefined);
    // }
  }

}


